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

import icp_server.storage;
import icp_server.types as types;

import ballerina/http;
import ballerina/log;

// HTTP service configuration
listener http:Listener httpListener = new (serverPort, config = {host: serverHost});

// Runtime management service
service /icp on httpListener {

    // Process heartbeat from runtime - now handles both registration and updates
    isolated resource function post heartbeat(types:Heartbeat heartbeat) returns types:HeartbeatResponse|error? {
        do {
            // Process heartbeat using the repository (handles both registration and updates)
            types:HeartbeatResponse heartbeatResponse = check storage:processHeartbeat(heartbeat);

            return heartbeatResponse;

        } on fail error e {
            // Return error response
            log:printError("Failed to process heartbeat", e);
            types:HeartbeatResponse errorResponse = {
                acknowledged: false,
                commands: []
            };

            return errorResponse;
        }
    }

}
