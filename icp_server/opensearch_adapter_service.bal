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
final http:Client opensearchClient = check new (opensearchUrl,
    config = {
        auth: {
            username: opensearchUsername,
            password: opensearchPassword
        },
        secureSocket: {
            enable: false
        }
    }
);

// HTTP service configuration
listener http:Listener openSerachObservabilityListener = new (defaultOpensearchAdaptorPort,
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
    // auth: [
    //     {
    //         jwtValidatorConfig: {
    //             issuer: frontendJwtIssuer,
    //             audience: frontendJwtAudience,
    //             signatureConfig: {
    //                 secret: defaultobservabilityJwtHMACSecret
    //             }
    //         }
    //     }
    // ],
    cors: {
        allowOrigins: ["*"],
        allowHeaders: ["Content-Type", "Authorization"]
    }
}
service /observability on openSerachObservabilityListener {

    function init() {
        log:printInfo("Opensearch adapter service started at " + serverHost + ":" + observabilityServerPort.toString());
    }

    resource function post logs(@http:Header {name: "X-API-Key"} string? apiKeyHeader, http:Request request, types:LogEntryRequest logRequest) returns types:LogEntriesResponse|error {
        log:printInfo("Received log request for component: " + logRequest.toString());

        // Build OpenSearch query
        json query = buildLogQuery(logRequest);

        // Execute search against OpenSearch
        string sortOrder = logRequest.sort == "asc" ? "asc" : "desc";
        json searchRequest = {
            "query": query,
            "size": logRequest.'limit,
            "sort": [
                {"@timestamp": sortOrder}
            ]
        };

        log:printDebug("OpenSearch query: " + searchRequest.toJsonString());

        // Call OpenSearch
        json searchResponse = check opensearchClient->post("/ballerina-application-logs-*/_search", searchRequest);

        // Extract hits from response
        json hits = check searchResponse.hits;
        json[] hitArray = <json[]>check hits.hits;

        // Build response columns
        types:LogColumn[] columns = [
            {name: "TimeGenerated", 'type: "datetime"},
            {name: "LogLevel", 'type: "string"},
            {name: "LogEntry", 'type: "dynamic"},
            {name: "LogContext", 'type: "dynamic"},
            {name: "ComponentVersion", 'type: "string"},
            {name: "ComponentVersionId", 'type: "string"}
        ];

        // Build response rows
        json[][] rows = [];
        foreach json hit in hitArray {
            map<json> hitMap = check hit.cloneWithType();
            map<json> sourceData = check hitMap["_source"].cloneWithType();

            // Extract fields from the log entry
            json timestampJson = sourceData["@timestamp"] ?: "";
            string timestamp = timestampJson is string ? timestampJson : timestampJson.toString();
            json levelJson = sourceData["level"] ?: "INFO";
            string level = levelJson is string ? levelJson : "INFO";

            // Construct the full log entry string
            string logEntry = check constructLogEntry(sourceData);

            json[] row = [
                timestamp,
                level,
                logEntry,
                (), // LogContext - null for now
                "",
                ""
            ];
            rows.push(row);
        }

        log:printInfo("Returning " + rows.length().toString() + " log entries");

        return {
            columns: columns,
            rows: rows
        };
    }
}

// Helper function to build OpenSearch query based on request parameters
function buildLogQuery(types:LogEntryRequest logRequest) returns json {
    json[] mustClauses = [];

    // Filter by runtime IDs if specified
    string[] runtimeIds = logRequest.runtimeIdList;
    if (runtimeIds.length() > 0) {
        mustClauses.push({
            "terms": {
                "icp_runtimeId.keyword": runtimeIds
            }
        });
    }

    // Filter by log levels if specified
    string[]? levels = logRequest.logLevels;
    if (levels is string[] && levels.length() > 0) {
        mustClauses.push({
            "terms": {
                "level.keyword": levels
            }
        });
    }

    // Filter by search phrase if specified
    string? searchPhrase = logRequest.searchPhrase;
    if (searchPhrase is string && searchPhrase.length() > 0) {
        mustClauses.push({
            "match": {
                "message": searchPhrase
            }
        });
    }

    // Filter by regex phrase if specified
    string? regexPhrase = logRequest.regexPhrase;
    if (regexPhrase is string && regexPhrase.length() > 0) {
        mustClauses.push({
            "regexp": {
                "message": regexPhrase
            }
        });
    }

    // Time range filter
    map<json> timeRange = {};
    string? startTime = logRequest.startTime;
    if (startTime is string) {
        timeRange["gte"] = startTime;
    }
    string? endTime = logRequest.endTime;
    if (endTime is string) {
        timeRange["lte"] = endTime;
    }
    if (timeRange.length() > 0) {
        mustClauses.push({
            "range": {
                "@timestamp": timeRange
            }
        });
    }

    return {
        "bool": {
            "must": mustClauses
        }
    };
}

// Helper function to construct log entry string from OpenSearch document
function constructLogEntry(map<json> sourceData) returns string|error {
    json timeJson = check sourceData.time;
    string time = timeJson is string ? timeJson : "";

    json levelJson = check sourceData.level;
    string level = levelJson is string ? levelJson : "";

    json moduleJson = check sourceData.module;
    string module = moduleJson is string ? moduleJson : "";

    json messageJson = check sourceData.message;
    string message = messageJson is string ? messageJson : "";

    // Additional fields that might be present
    string traceId = "";
    json traceIdJson = sourceData["traceId"] ?: ();
    if (traceIdJson is string) {
        traceId = " traceId=\"" + traceIdJson + "\"";
    }

    string spanId = "";
    json spanIdJson = sourceData["spanId"] ?: ();
    if (spanIdJson is string) {
        spanId = " spanId=\"" + spanIdJson + "\"";
    }

    string runtimeId = "";
    json runtimeIdJson = sourceData["icp_runtimeId"] ?: ();
    if (runtimeIdJson is string) {
        runtimeId = " icp.runtimeId=\"" + runtimeIdJson + "\"";
    }

    // Construct the log entry in logfmt style
    return string `time=${time} level=${level} module=${module} message="${message}"${traceId}${spanId}${runtimeId}`;
}
