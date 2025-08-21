// Copyright (c) 2025, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
//
// WSO2 Inc. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import icp_server.types as types;

import ballerina/cache;
import ballerina/log;
import ballerina/sql;
import ballerina/time;

final DatabaseConnectionManager dbManager = check new (dbType);
public final sql:Client dbClient = dbManager.getClient();

// Cache for storing runtime hash values
final cache:Cache hashCache = new (capacity = 1000, evictionFactor = 0.2);

// Heartbeat timeout in seconds from main module config
configurable int heartbeatTimeoutSeconds = 300;

// Helper function to convert time:Utc to MySQL datetime format
isolated function utcToMySQLDateTime(time:Utc utcTime) returns string|error {
    time:Civil civilTime = time:utcToCivil(utcTime);
    // Format: YYYY-MM-DD HH:MM:SS
    string formattedTime = string `${civilTime.year}-${civilTime.month.toString().padStart(2, "0")}-${civilTime.day.toString().padStart(2, "0")} ${civilTime.hour.toString().padStart(2, "0")}:${civilTime.minute.toString().padStart(2, "0")}:${(<int>civilTime.second).toString().padStart(2, "0")}`;
    return formattedTime;
}

// Periodically mark runtimes as OFFLINE if heartbeat is too old
public isolated function markOfflineRuntimes() returns error? {
    log:printDebug("Marking offline runtimes");
    time:Utc now = time:utcNow();
    // Calculate the threshold timestamp
    time:Utc threshold = time:utcAddSeconds(now, -<decimal>heartbeatTimeoutSeconds);
    
    // Convert threshold to MySQL datetime format
    string thresholdStr = check utcToMySQLDateTime(threshold);
    
    // Update all runtimes whose last_heartbeat is too old and not already OFFLINE
    sql:ParameterizedQuery updateQuery = `
        UPDATE runtimes
        SET status = 'OFFLINE'
        WHERE status != 'OFFLINE'
        AND last_heartbeat IS NOT NULL
        AND last_heartbeat < ${thresholdStr}
    `;
    sql:ExecutionResult _ = check dbClient->execute(updateQuery);
}

// Process delta heartbeat with hash validation
public isolated function processDeltaHeartbeat(types:DeltaHeartbeat deltaHeartbeat) returns types:HeartbeatResponse|error {
    // Validate delta heartbeat data
    if deltaHeartbeat.runtimeId.trim().length() == 0 {
        return error("Runtime ID cannot be empty");
    }

    time:Utc currentTime = time:utcNow();
    string currentTimeStr = check utcToMySQLDateTime(currentTime);
    types:ControlCommand[] pendingCommands = [];
    boolean hashMatches = false;

    if hashCache.hasKey(deltaHeartbeat.runtimeId) {
        any|error cachedHash = hashCache.get(deltaHeartbeat.runtimeId);
        hashMatches = cachedHash is string && cachedHash == deltaHeartbeat.runtimeHash;
        log:printInfo(string `Hash for runtime ${deltaHeartbeat.runtimeId} matches: ${hashMatches}`);
    }

    if !hashMatches {
        // Hash doesn't match or runtime not in cache, request full heartbeat
        log:printInfo(string `Hash mismatch for runtime ${deltaHeartbeat.runtimeId}, requesting full heartbeat`);

        // Still update the timestamp to show runtime is alive
        transaction {
            sql:ExecutionResult _ = check dbClient->execute(`
                UPDATE runtimes 
                SET last_heartbeat = ${currentTimeStr}
                WHERE runtime_id = ${deltaHeartbeat.runtimeId}
            `);

            check commit;
        } on fail error e {
            log:printError(string `Failed to update timestamp for runtime ${deltaHeartbeat.runtimeId}`, e);
            return error(string `Failed to process delta heartbeat for runtime ${deltaHeartbeat.runtimeId}`, e);
        }

        return {
            acknowledged: true,
            fullHeartbeatRequired: true,
            commands: []
        };
    }

    // Hash matches, process delta heartbeat
    transaction {
        // Update only the heartbeat timestamp
        sql:ExecutionResult _ = check dbClient->execute(`
            UPDATE runtimes 
            SET last_heartbeat = ${currentTimeStr}
            WHERE runtime_id = ${deltaHeartbeat.runtimeId}
        `);

        // Retrieve pending control commands for this runtime
        stream<types:ControlCommand, sql:Error?> commandStream = dbClient->query(`
            SELECT command_id, runtime_id, target_artifact, action, issued_at, status
            FROM control_commands 
            WHERE runtime_id = ${deltaHeartbeat.runtimeId} 
            AND status = 'pending'
            ORDER BY issued_at ASC
        `);

        check from types:ControlCommand command in commandStream
            do {
                pendingCommands.push(command);
            };

        // Mark retrieved commands as 'sent'
        if pendingCommands.length() > 0 {
            foreach types:ControlCommand command in pendingCommands {
                _ = check dbClient->execute(`
                    UPDATE control_commands 
                    SET status = 'sent' 
                    WHERE command_id = ${command.commandId}
                `);
            }
        }

        // Create audit log entry
        _ = check dbClient->execute(`
            INSERT INTO audit_logs (
                runtime_id, action, details, timestamp
            ) VALUES (
                ${deltaHeartbeat.runtimeId}, 'DELTA_HEARTBEAT', 
                ${string `Delta heartbeat processed with hash ${deltaHeartbeat.runtimeHash}`},
                ${currentTimeStr}
            )
        `);

        check commit;
        log:printInfo(string `Successfully processed delta heartbeat for runtime ${deltaHeartbeat.runtimeId}`);

    } on fail error e {
        log:printError(string `Failed to process delta heartbeat for runtime ${deltaHeartbeat.runtimeId}`, e);
        return error(string `Failed to process delta heartbeat for runtime ${deltaHeartbeat.runtimeId}`, e);
    }

    return {
        acknowledged: true,
        fullHeartbeatRequired: false,
        commands: pendingCommands
    };
}

// Heartbeat processing that handles both registration and updates
public isolated function processHeartbeat(types:Heartbeat heartbeat) returns types:HeartbeatResponse|error {
    // Validate heartbeat data before starting transaction
    error? validationResult = validateHeartbeatData(heartbeat);
    if validationResult is error {
        return validationResult;
    }

    time:Utc currentTime = time:utcNow();
    string currentTimeStr = check utcToMySQLDateTime(currentTime);
    boolean isNewRegistration = false;
    types:ControlCommand[] pendingCommands = [];

    // Start transaction for heartbeat processing
    transaction {
        // Check if runtime exists
        stream<record {|string runtime_id;|}, sql:Error?> existingRuntimeStream = dbClient->query(`
            SELECT runtime_id FROM runtimes WHERE runtime_id = ${heartbeat.runtimeId}
        `);

        record {|string runtime_id;|}[] existingRuntimes = check from record {|string runtime_id;|} existingRuntime in existingRuntimeStream
            select existingRuntime;

        isNewRegistration = existingRuntimes.length() == 0;

        if isNewRegistration {
            // Register new runtime
            sql:ExecutionResult _ = check dbClient->execute(`
                INSERT INTO runtimes (
                    runtime_id, runtime_type, status, environment,
                    deployment_type, version, platform_name, 
                    platform_version, platform_home, os_name,
                    os_version, registration_time, last_heartbeat
                ) VALUES (
                    ${heartbeat.runtimeId}, ${heartbeat.runtimeType}, 
                    ${heartbeat.status}, ${heartbeat.environment}, 
                    ${heartbeat.deploymentType}, ${heartbeat.version},
                    ${heartbeat.nodeInfo.platformName}, ${heartbeat.nodeInfo.platformVersion},
                    ${heartbeat.nodeInfo.ballerinaHome}, ${heartbeat.nodeInfo.osName},
                    ${heartbeat.nodeInfo.osVersion}, ${currentTimeStr},
                    ${currentTimeStr}
                )
            `);

            // TODO: Uncomment the following lines when https://github.com/ballerina-platform/ballerina-lang/issues/44219 fixed
            // if insertResult.affectedRowCount == 0 {
            //     rollback;
            //     return error(string `Failed to register runtime ${heartbeat.runtimeId}`);
            // }

            log:printInfo(string `Registered new runtime via heartbeat: ${heartbeat.runtimeId}`);
        } else {
            // Update existing runtime
            sql:ExecutionResult _ = check dbClient->execute(`
                UPDATE runtimes 
                SET status = ${heartbeat.status}, 
                    runtime_type = ${heartbeat.runtimeType},
                    environment = ${heartbeat.environment},
                    deployment_type = ${heartbeat.deploymentType},
                    version = ${heartbeat.version},
                    platform_name = ${heartbeat.nodeInfo.platformName},
                    platform_version = ${heartbeat.nodeInfo.platformVersion},
                    platform_home = ${heartbeat.nodeInfo.ballerinaHome},
                    os_name = ${heartbeat.nodeInfo.osName},
                    os_version = ${heartbeat.nodeInfo.osVersion},
                    last_heartbeat = ${currentTimeStr}
                WHERE runtime_id = ${heartbeat.runtimeId}
            `);

            // TODO: Uncomment the following lines when https://github.com/ballerina-platform/ballerina-lang/issues/44219 fixed
            // if updateResult.affectedRowCount == 0 {
            //     rollback;
            //     return error(string `Failed to update runtime ${heartbeat.runtimeId}`);
            // }
            log:printInfo(string `Updated runtime via heartbeat: ${heartbeat.runtimeId}`);
        }

        // Update artifacts information (services and listeners)
        // First, delete existing artifacts for this runtime
        _ = check dbClient->execute(`
            DELETE FROM runtime_services WHERE runtime_id = ${heartbeat.runtimeId}
        `);

        _ = check dbClient->execute(`
            DELETE FROM runtime_listeners WHERE runtime_id = ${heartbeat.runtimeId}
        `);

        _ = check dbClient->execute(`
            DELETE FROM service_resources WHERE runtime_id = ${heartbeat.runtimeId}
        `);

        // Insert updated services
        foreach types:ServiceDetail serviceDetail in heartbeat.artifacts.services {
            _ = check dbClient->execute(`
                INSERT INTO runtime_services (
                    runtime_id, service_name, service_package, base_path, state
                ) VALUES (
                    ${heartbeat.runtimeId}, ${serviceDetail.name}, 
                    ${serviceDetail.package}, ${serviceDetail.basePath}, 
                    ${serviceDetail.state}
                )
            `);

            // Insert resources for each service
            foreach types:Resource resourceDetail in serviceDetail.resources {
                string methodsJson = resourceDetail.methods.toJsonString();
                _ = check dbClient->execute(`
                    INSERT INTO service_resources (
                        runtime_id, service_name, resource_url, methods
                    ) VALUES (
                        ${heartbeat.runtimeId}, ${serviceDetail.name}, 
                        ${resourceDetail.url}, ${methodsJson}
                    )
                `);
            }
        }

        // Insert updated listeners
        foreach types:ListenerDetail listenerDetail in heartbeat.artifacts.listeners {
            _ = check dbClient->execute(`
                INSERT INTO runtime_listeners (
                    runtime_id, listener_name, listener_package, protocol, state
                ) VALUES (
                    ${heartbeat.runtimeId}, ${listenerDetail.name}, 
                    ${listenerDetail.package}, ${listenerDetail.protocol}, 
                    ${listenerDetail.state}
                )
            `);
        }

        // Retrieve pending control commands for this runtime
        stream<types:ControlCommand, sql:Error?> commandStream = dbClient->query(`
            SELECT command_id, runtime_id, target_artifact, action, issued_at, status
            FROM control_commands 
            WHERE runtime_id = ${heartbeat.runtimeId} 
            AND status = 'pending'
            ORDER BY issued_at ASC
        `);

        check from types:ControlCommand command in commandStream
            do {
                pendingCommands.push(command);
            };

        // Mark retrieved commands as 'sent'
        if pendingCommands.length() > 0 {
            foreach types:ControlCommand command in pendingCommands {
                _ = check dbClient->execute(`
                    UPDATE control_commands 
                    SET status = 'sent' 
                    WHERE command_id = ${command.commandId}
                `);
            }
        }

        // Create audit log entry
        string action = isNewRegistration ? "REGISTER" : "HEARTBEAT";
        _ = check dbClient->execute(`
            INSERT INTO audit_logs (
                runtime_id, action, details, timestamp
            ) VALUES (
                ${heartbeat.runtimeId}, ${action}, 
                ${string `Runtime ${action.toLowerAscii()} processed with ${heartbeat.artifacts.services.length()} services and ${heartbeat.artifacts.listeners.length()} listeners`},
                ${currentTimeStr}
            )
        `);
        check commit;
        log:printInfo(string `Successfully processed ${action.toLowerAscii()} for runtime ${heartbeat.runtimeId} with ${heartbeat.artifacts.services.length()} services and ${heartbeat.artifacts.listeners.length()} listeners`);

    } on fail error e {
        // In case of error, the transaction block is rolled back automatically.
        log:printError(string `Failed to process heartbeat for runtime ${heartbeat.runtimeId}`, e);
        return error(string `Failed to process heartbeat for runtime ${heartbeat.runtimeId}`, e);
    }

    // Cache the runtime hash value after successful processing (outside transaction)
    error? cacheResult = hashCache.put(heartbeat.runtimeId, heartbeat.runtimeHash);
    if cacheResult is error {
        log:printWarn(string `Failed to cache runtime hash for ${heartbeat.runtimeId}`, cacheResult);
    } else {
        log:printDebug(string `Cached runtime hash for ${heartbeat.runtimeId}: ${heartbeat.runtimeHash}`);
    }

    // Return heartbeat response with pending commands (outside transaction)
    return {
        acknowledged: true,
        commands: pendingCommands
    };
}

// Validation function for heartbeat data
isolated function validateHeartbeatData(types:Heartbeat heartbeat) returns error? {
    // Validate required fields
    if heartbeat.runtimeId.trim().length() == 0 {
        return error("Runtime ID cannot be empty");
    }

    if heartbeat.runtimeId.length() > 100 {
        return error("Runtime ID cannot exceed 100 characters");
    }

    // Validate runtime type
    if heartbeat.runtimeType != types:MI && heartbeat.runtimeType != types:BI {
        return error("Invalid runtime type. Must be MI or BI");
    }

    // Validate runtime status
    if heartbeat.status != types:RUNNING &&
        heartbeat.status != types:FAILED &&
        heartbeat.status != types:DISABLED &&
        heartbeat.status != types:OFFLINE &&
        heartbeat.status != types:STOPPED {
        return error("Invalid runtime status");
    }

    // Validate node info
    if heartbeat.nodeInfo.platformName.trim().length() == 0 {
        return error("Platform name cannot be empty");
    }

    // Validate artifacts
    foreach types:ServiceDetail serviceDetail in heartbeat.artifacts.services {
        if serviceDetail.name.trim().length() == 0 {
            return error("Service name cannot be empty");
        }
        if serviceDetail.package.trim().length() == 0 {
            return error("Service package cannot be empty");
        }
    }

    foreach types:ListenerDetail listenerDetail in heartbeat.artifacts.listeners {
        if listenerDetail.name.trim().length() == 0 {
            return error("Listener name cannot be empty");
        }
        if listenerDetail.package.trim().length() == 0 {
            return error("Listener package cannot be empty");
        }
    }

    return ();
}