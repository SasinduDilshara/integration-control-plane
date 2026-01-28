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

import ballerina/log;
import ballerina/sql;
import ballerina/uuid;

// Shared database connection manager and client
final DatabaseConnectionManager dbManager = check new (dbType);
public final sql:Client dbClient = dbManager.getClient();

// Constants for artifact management
const string ICP_ARTIFACTS_PATH = "/icp/artifacts";

// Helper function to get display name by user ID
isolated function getDisplayNameById(string? userId) returns string? {
    if userId is () {
        return ();
    }

    types:User|error user = getUserDetailsById(userId);
    if user is types:User {
        return user.displayName;
    }

    // Return user ID if display name not found
    return userId;
}

// Helper function to get count from a query
isolated function getCount(sql:ParameterizedQuery query) returns int|error {
    stream<record {|int count;|}, sql:Error?> countStream = dbClient->query(query);
    record {|int count;|}[] results = check from record {|int count;|} count in countStream
        select count;

    if results.length() > 0 {
        return results[0].count;
    }
    return 0;
}

// Get component type for a runtime
isolated function getComponentTypeByRuntimeId(string runtimeId) returns string?|error {
    stream<record {|string component_type;|}, sql:Error?> componentStream = dbClient->query(`
        SELECT c.component_type
        FROM runtimes r
        JOIN components c ON r.component_id = c.component_id
        WHERE r.runtime_id = ${runtimeId}
    `);

    record {|record {|string component_type;|} value;|}|sql:Error? streamRecord = componentStream.next();
    check componentStream.close();

    if streamRecord is record {|record {|string component_type;|} value;|} {
        return streamRecord.value.component_type;
    }

    return ();
}

// Retrieve and mark BI control commands as sent (within transaction)
// Caller must ensure the runtime belongs to a BI component before calling this function
isolated function sendPendingBIControlCommands(string runtimeId) returns types:ControlCommand[]|error {
    types:ControlCommand[] pendingCommands = [];

    // Retrieve pending control commands for this BI runtime
    stream<types:ControlCommandDBRecord, sql:Error?> commandStream = dbClient->query(`
        SELECT command_id, runtime_id, target_artifact, action, issued_at, status
        FROM bi_runtime_control_commands
        WHERE runtime_id = ${runtimeId}
        AND status = 'pending'
        ORDER BY issued_at ASC
    `);

    check from types:ControlCommandDBRecord dbCommand in commandStream
        do {
            types:ControlCommand command = {
                commandId: dbCommand.command_id,
                runtimeId: dbCommand.runtime_id,
                targetArtifact: {name: dbCommand.target_artifact},
                action: dbCommand.action == "START" ? types:START : types:STOP,
                issuedAt: dbCommand.issued_at,
                status: convertToControlCommandStatus(dbCommand.status)
            };
            pendingCommands.push(command);
        };

    // Mark retrieved commands as 'sent'
    if pendingCommands.length() > 0 {
        foreach types:ControlCommand command in pendingCommands {
            _ = check dbClient->execute(`
                UPDATE bi_runtime_control_commands
                SET status = 'sent'
                WHERE command_id = ${command.commandId}
            `);
        }
    }

    return pendingCommands;
}

// Retrieve and mark MI control commands as sent (within transaction)
// Caller must ensure the runtime belongs to an MI component before calling this function
isolated function sendPendingMIControlCommands(string runtimeId) returns types:ControlCommand[]|error {
    types:ControlCommand[] pendingCommands = [];

    // TODO: Implement MI control command retrieval from mi_runtime_control_commands table
    // This will be implemented when MI control command GraphQL mutations are added
    log:printDebug(string `MI control command retrieval not yet implemented for runtime ${runtimeId}`);

    return pendingCommands;
}

// Convert database status string to ControlCommandStatus enum
isolated function convertToControlCommandStatus(string status) returns types:ControlCommandStatus {
    match status {
        "pending" => {
            return types:PENDING;
        }
        "sent" => {
            return types:SENT;
        }
        "acknowledged" => {
            return types:ACKNOWLEDGED;
        }
        "failed" => {
            return types:FAILED;
        }
        "completed" => {
            return types:COMPLETED;
        }
        _ => {
            return types:PENDING;
        }
    }
}

// Count total artifacts in heartbeat
isolated function countTotalArtifacts(types:Artifacts artifacts) returns int {
    int totalArtifacts = artifacts.services.length() + artifacts.listeners.length();

    totalArtifacts += (<types:RestApi[]>artifacts.apis).length();

    totalArtifacts += (<types:ProxyService[]>artifacts.proxyServices).length();

    totalArtifacts += (<types:Endpoint[]>artifacts.endpoints).length();

    totalArtifacts += (<types:InboundEndpoint[]>artifacts.inboundEndpoints).length();

    totalArtifacts += (<types:Sequence[]>artifacts.sequences).length();

    totalArtifacts += (<types:Task[]>artifacts.tasks).length();

    totalArtifacts += (<types:Template[]>artifacts.templates).length();

    totalArtifacts += (<types:MessageStore[]>artifacts.messageStores).length();

    totalArtifacts += (<types:MessageProcessor[]>artifacts.messageProcessors).length();

    totalArtifacts += (<types:LocalEntry[]>artifacts.localEntries).length();

    totalArtifacts += (<types:DataService[]>artifacts.dataServices).length();

    totalArtifacts += (<types:CarbonApp[]>artifacts.carbonApps).length();

    totalArtifacts += (<types:DataSource[]>artifacts.dataSources).length();

    totalArtifacts += (<types:Connector[]>artifacts.connectors).length();

    totalArtifacts += (<types:RegistryResource[]>artifacts.registryResources).length();

    return totalArtifacts;
}

// Insert a control command for a runtime
public isolated function insertControlCommand(
        string runtimeId,
        string targetArtifact,
        types:ControlAction action,
        string? issuedBy = ()
) returns string|error {
    // Generate a unique command ID
    string commandId = uuid:createType1AsString();

    // Convert action enum to string
    string actionStr = action.toString();

    // Insert control command
    _ = check dbClient->execute(`
        INSERT INTO bi_runtime_control_commands (
            command_id, runtime_id, target_artifact, action, status, issued_at, issued_by
        ) VALUES (
            ${commandId}, ${runtimeId}, ${targetArtifact}, ${actionStr}, 'pending', CURRENT_TIMESTAMP, ${issuedBy}
        )
    `);

    return commandId;
}
// Upsert BI artifact intended state for a component
public isolated function upsertBIArtifactIntendedState(
        string componentId,
        string targetArtifact,
        string action,
        string? issuedBy = ()
) returns error? {
    if dbType == MSSQL {
        _ = check dbClient->execute(`
            MERGE INTO bi_artifact_intended_state AS target
            USING (VALUES (${componentId}, ${targetArtifact}, ${action}, ${issuedBy}))
                   AS source (component_id, target_artifact, action, issued_by)
            ON (target.component_id = source.component_id AND target.target_artifact = source.target_artifact)
            WHEN MATCHED THEN
                UPDATE SET action = source.action, issued_at = CURRENT_TIMESTAMP, 
                           issued_by = source.issued_by, updated_at = CURRENT_TIMESTAMP
            WHEN NOT MATCHED THEN
                INSERT (component_id, target_artifact, action, issued_by)
                VALUES (source.component_id, source.target_artifact, source.action, source.issued_by);
        `);
    } else {
        _ = check dbClient->execute(`
            INSERT INTO bi_artifact_intended_state (
                component_id, target_artifact, action, issued_by
            ) VALUES (
                ${componentId}, ${targetArtifact}, ${action}, ${issuedBy}
            )
            ON DUPLICATE KEY UPDATE
                action = VALUES(action),
                issued_at = CURRENT_TIMESTAMP,
                issued_by = VALUES(issued_by),
                updated_at = CURRENT_TIMESTAMP
        `);
    }
}

// Get BI artifact intended states for a component
public isolated function getBIIntendedStatesForComponent(string componentId) returns map<string>|error {
    map<string> intendedStates = {};

    stream<record {|string target_artifact; string action;|}, sql:Error?> stateStream = dbClient->query(`
        SELECT target_artifact, action
        FROM bi_artifact_intended_state
        WHERE component_id = ${componentId}
    `);

    check from record {|string target_artifact; string action;|} state in stateStream
        do {
            intendedStates[state.target_artifact] = state.action;
        };

    return intendedStates;
}

// Delete BI artifact intended state
public isolated function deleteBIArtifactIntendedState(
        string componentId,
        string targetArtifact
) returns error? {
    _ = check dbClient->execute(`
        DELETE FROM bi_artifact_intended_state
        WHERE component_id = ${componentId}
        AND target_artifact = ${targetArtifact}
    `);
}