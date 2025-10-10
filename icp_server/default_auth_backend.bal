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
import icp_server.types;

import ballerina/crypto;
import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/time;

configurable int authServicePort = 9447;
configurable string authServiceHost = "0.0.0.0";
configurable string apiKey = "default-api-key";

listener http:Listener defaultAuthServiceListener = new (authServicePort,
    config = {
        host: authServiceHost,
        secureSocket: {
            key: {
                path: keystorePath,
                password: keystorePassword
            }
        }
    }
);

service / on defaultAuthServiceListener {

    function init() {
        log:printInfo("Authentication service started at " + authServiceHost + ":" + authServicePort.toString());
    }

    resource function post authenticate(@http:Header {name: "X-API-Key"} string? apiKeyHeader, types:Credentials request) returns http:Ok|http:BadRequest|http:Unauthorized|error {

        // TODO Validate API key
        if apiKeyHeader is () || apiKeyHeader != apiKey {
            log:printWarn("Authentication attempt with invalid API key");
            return createBadRequestError("Invalid API key");
        }

        // Perform authentication against database
        string|error userEmail = authenticateUser(request.email, request.password);
        if userEmail is error {
            log:printError("Error authenticating user", userEmail);
            return createUnauthorizedError("Invalid credentials");
        }

        // Create response timestamp
        string responseTimestamp = time:utcToString(time:utcNow());
        log:printInfo("User authenticated successfully: " + userEmail);
        return <http:Ok>{
            body: {
                authenticated: true,
                email: userEmail,
                timestamp: responseTimestamp
            }
        };
    }
}

isolated function authenticateUser(string email, string password) returns string|error {
    sql:Client dbClient = storage:dbClient;

    // Query user credentials from the user_credentials table
    types:UserCredentials|sql:Error credentials = dbClient->queryRow(
        `SELECT email, password_hash as passwordHash 
         FROM user_credentials 
         WHERE email = ${email}`
    );

    if credentials is sql:Error {
        log:printError("Error getting credentials from database", credentials);
        return error("Invalid credentials");
    }

    // Validate password using bcrypt
    boolean|crypto:Error? matches = crypto:verifyBcrypt(password, credentials.passwordHash);
    if matches is crypto:Error {
        log:printError("Unable to verify password", matches);
        return error("Invalid credentials");
    } else if matches is boolean && !matches {
        log:printError("Invalid password", email = email);
        return error("Invalid credentials");
    }

    return email;
}

