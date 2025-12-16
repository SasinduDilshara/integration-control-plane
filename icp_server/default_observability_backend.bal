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

import ballerina/http;
import ballerina/log;

// HTTP client for OpenSearch with SSL verification disabled
final http:Client observabilityClient = check new (observabilityBackendURL,
    config = {
        secureSocket: {
            enable: false
        }
    }
);

// HTTP service configuration
listener http:Listener observabilityListener = new (observabilityServerPort,
    config = {
        host: serverHost,
        secureSocket: {
            key: {
                path: keystorePath,
                password: keystorePassword
            }
        }
    }
);

@http:ServiceConfig {
    auth: [
        {
            jwtValidatorConfig: {
                issuer: frontendJwtIssuer,
                audience: frontendJwtAudience,
                signatureConfig: {
                    secret: defaultobservabilityJwtHMACSecret
                }
            }
        }
    ],
    cors: {
        allowOrigins: ["*"],
        allowHeaders: ["Content-Type", "Authorization"]
    }
}
service /icp/observability on observabilityListener {

    function init() {
        log:printInfo("Observability service started at " + serverHost + ":" + observabilityServerPort.toString());
    }

    resource function post logs(http:Request request, types:LogEntryRequest logRequest) returns types:LogEntriesResponse|error {
        log:printInfo("Received log request for component: " + logRequest.componentId);

        // Invoke observability backend
        return check observabilityClient->post("/observability/logs/", logRequest);
    }
}

