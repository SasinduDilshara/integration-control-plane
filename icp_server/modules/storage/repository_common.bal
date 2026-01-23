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

import ballerina/sql;
import ballerina/uuid;

// Shared database connection manager and client
final DatabaseConnectionManager dbManager = check new (dbType);
public final sql:Client dbClient = dbManager.getClient();

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

// Retrieve and mark control commands as sent (within transaction)
isolated function retrieveAndMarkCommandsAsSent(string runtimeId) returns types:ControlCommand[]|error {
    types:ControlCommand[] pendingCommands = [];

    // Retrieve pending control commands for this runtime
    // Lock pending commands to avoid concurrent modifications
    stream<types:ControlCommandDBRecord, sql:Error?> commandStream = dbClient->query(`
        SELECT command_id, runtime_id, target_artifact, action, issued_at, status
        FROM control_commands
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
                UPDATE control_commands
                SET status = 'sent'
                WHERE command_id = ${command.commandId}
            `);
        }
    }

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
        INSERT INTO control_commands (
            command_id, runtime_id, target_artifact, action, status, issued_at, issued_by
        ) VALUES (
            ${commandId}, ${runtimeId}, ${targetArtifact}, ${actionStr}, 'pending', CURRENT_TIMESTAMP, ${issuedBy}
        )
    `);

    return commandId;
}
