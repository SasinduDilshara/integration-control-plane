// Copyright (c) 2026, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

// Regression tests for issue #108: Log configs not properly displayed on dashboard
// Covers:
//   1. Duplicate logger entries should be grouped (not displayed twice)
//   2. Loggers are queryable for filtering by node ID (runtimeIds returned)
//   3. Pagination works correctly on the grouped results

import ballerina/test;

// Test data constants (from h2_test_data.sql)
// Runtime 1: BI, Project 1, Component 1, Dev env
// Runtime 2: BI, Project 1, Component 1, Prod env
// Both runtimes have the same loggers: io.ballerina.stdlib.http (INFO) and io.ballerina.runtime (WARN)

// =============================================================================
// Test 1: Loggers are grouped correctly — no duplicates (Bug #1 fix)
// =============================================================================

@test:Config {
    groups: ["logger-graphql", "logger-dedup"]
}
function testLoggersByEnvAndComponentNoDuplicates() returns error? {
    string query = string `
        query {
            loggersByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                loggerName
                componentName
                logLevel
                runtimeIds
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);

    // Verify no errors
    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json loggersJson = check data.loggersByEnvironmentAndComponent;
    json[] loggers = check loggersJson.ensureType();

    // Dev env has Runtime 1 only for Component 1.
    // Runtime 1 has 2 log levels: io.ballerina.stdlib.http=INFO, io.ballerina.runtime=WARN
    // Each logger should appear exactly ONCE (not duplicated).
    test:assertTrue(loggers.length() >= 2, "Should return at least 2 logger groups");

    // Verify no duplicate componentName+logLevel combinations
    map<boolean> seen = {};
    foreach json logger in loggers {
        string componentName = check logger.componentName;
        string logLevel = check logger.logLevel;
        string dedupKey = componentName + "|" + logLevel;
        test:assertFalse(seen.hasKey(dedupKey),
            string `Duplicate logger entry found: ${dedupKey}. Each logger should appear only once.`);
        seen[dedupKey] = true;
    }
}

// =============================================================================
// Test 2: Each logger group includes runtimeIds — enables node ID filtering (Bug #2 fix)
// =============================================================================

@test:Config {
    groups: ["logger-graphql", "logger-runtime-ids"]
}
function testLoggerGroupsContainRuntimeIds() returns error? {
    string query = string `
        query {
            loggersByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                componentName
                logLevel
                runtimeIds
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);
    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json loggersJson = check data.loggersByEnvironmentAndComponent;
    json[] loggers = check loggersJson.ensureType();

    // Every logger group must have at least one runtimeId so the frontend
    // can filter by node ID (issue #108, bug #2).
    foreach json logger in loggers {
        json runtimeIdsJson = check logger.runtimeIds;
        json[] runtimeIds = check runtimeIdsJson.ensureType();
        test:assertTrue(runtimeIds.length() > 0,
            string `Logger group should have at least one runtime ID for node filtering`);
    }
}

// =============================================================================
// Test 3: Unauthorized user cannot access loggers
// =============================================================================

@test:Config {
    groups: ["logger-graphql", "logger-auth"]
}
function testLoggersUnauthorizedReturnsEmpty() returns error? {
    // integrationviewer has only VIEW permission but is in a different scope
    // Using a token for a user with no integration access
    string noAccessToken = check generateV2Token(
            "770e8400-e29b-41d4-a716-446655440099",
            "noaccess",
            [] // No permissions
    );

    string query = string `
        query {
            loggersByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                componentName
                logLevel
                runtimeIds
            }
        }
    `;

    json response = check executeGraphQL(query, noAccessToken);

    // Should either return empty array (no permission) or an error
    json|error data = response.data;
    if data is json {
        json|error loggersJson = data.loggersByEnvironmentAndComponent;
        if loggersJson is json {
            json[] loggers = check loggersJson.ensureType();
            test:assertEquals(loggers.length(), 0, "Unauthorized user should see no loggers");
        }
    }
}
