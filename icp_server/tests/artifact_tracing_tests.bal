// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// Tests for Issue #437: "When tracing enabled/disabled it requires page refresh"
// Covers:
//   - Template GraphQL type exposes tracingInSync and statisticsInSync fields
//   - templatesByEnvironmentAndComponent enriches results from reconcile state
//   - tracingInSync=false when desired != observed (stale heartbeat scenario)
//   - tracingInSync=true when desired == observed (confirmed sync)
//   - MessageProcessor GraphQL type does NOT expose a tracing field
//   - updateArtifactTracingStatus mutation accepted for "template" artifact type

import ballerina/test;

// Test data IDs for Issue 437 (defined in h2_test_data.sql)
// MI Runtime 6: Project 1 / Component 1 / Dev / RUNNING (MI)
const string MI_RUNTIME_ID = "880e8400-e29b-41d4-a716-446655440006";

// Template names from test seed data
const string TEMPLATE_OUT_OF_SYNC = "hello-template";  // desired=enabled, observed=disabled → tracingInSync=false
const string TEMPLATE_IN_SYNC = "synced-template";     // desired=enabled, observed=enabled  → tracingInSync=true

// =============================================================================
// Test 1: templatesByEnvironmentAndComponent returns tracingInSync field
// Verifies the schema change (Template type now exposes tracingInSync).
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-tracing-schema"]
}
function testTemplateQueryAcceptsTracingInSyncField() returns error? {
    string query = string `
        query {
            templatesByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                type
                tracing
                tracingInSync
                statistics
                statisticsInSync
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);

    // The query must not produce a GraphQL schema validation error
    test:assertFalse(response.errors is json,
        "Querying tracingInSync/statisticsInSync on Template should not produce schema errors");
}

// =============================================================================
// Test 2: tracingInSync=false when desired != observed (stale heartbeat)
// "hello-template": desired=enabled, observed=disabled → tracingInSync=false
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-tracing-out-of-sync"]
}
function testTemplateTracingOutOfSyncReturnsFalse() returns error? {
    string query = string `
        query {
            templatesByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                tracing
                tracingInSync
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);
    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json templatesJson = check data.templatesByEnvironmentAndComponent;
    json[] templates = check templatesJson.ensureType();
    test:assertTrue(templates.length() > 0, "Should return at least one template");

    json? outOfSyncTemplate = findArtifactByName(templates, TEMPLATE_OUT_OF_SYNC);
    test:assertTrue(outOfSyncTemplate != (), string `Should find template '${TEMPLATE_OUT_OF_SYNC}'`);

    if outOfSyncTemplate != () {
        // tracing value from observed state
        string tracingVal = check (check outOfSyncTemplate.tracing).ensureType();
        test:assertEquals(tracingVal, "disabled",
            "tracing should reflect the (stale) observed state value");

        // tracingInSync must be false: desired=enabled but observed=disabled
        json tracingInSyncJson = check outOfSyncTemplate.tracingInSync;
        boolean tracingInSync = check tracingInSyncJson.ensureType();
        test:assertFalse(tracingInSync,
            "tracingInSync must be false when desired(enabled) != observed(disabled)");
    }
}

// =============================================================================
// Test 3: tracingInSync=true when desired == observed (confirmed sync)
// "synced-template": desired=enabled, observed=enabled → tracingInSync=true
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-tracing-in-sync"]
}
function testTemplateTracingInSyncReturnsTrue() returns error? {
    string query = string `
        query {
            templatesByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                tracing
                tracingInSync
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);
    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json templatesJson = check data.templatesByEnvironmentAndComponent;
    json[] templates = check templatesJson.ensureType();

    json? inSyncTemplate = findArtifactByName(templates, TEMPLATE_IN_SYNC);
    test:assertTrue(inSyncTemplate != (), string `Should find template '${TEMPLATE_IN_SYNC}'`);

    if inSyncTemplate != () {
        string tracingVal = check (check inSyncTemplate.tracing).ensureType();
        test:assertEquals(tracingVal, "enabled",
            "tracing should be enabled (from confirmed observed state)");

        json tracingInSyncJson = check inSyncTemplate.tracingInSync;
        boolean tracingInSync = check tracingInSyncJson.ensureType();
        test:assertTrue(tracingInSync,
            "tracingInSync must be true when desired(enabled) == observed(enabled)");
    }
}

// =============================================================================
// Test 4: statisticsInSync field is accepted by the schema
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-statistics-schema"]
}
function testTemplateQueryAcceptsStatisticsInSyncField() returns error? {
    string query = string `
        query {
            templatesByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                statistics
                statisticsInSync
            }
        }
    `;

    json response = check executeGraphQL(query, orgDevToken);
    test:assertFalse(response.errors is json,
        "Querying statisticsInSync on Template should not produce schema errors");
}

// =============================================================================
// Test 5: MessageProcessor query succeeds without tracing field
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "message-processor-schema"]
}
function testMessageProcessorQueryWithoutTracingSucceeds() returns error? {
    // Valid query — only fields the MessageProcessor type actually exposes
    string validQuery = string `
        query {
            messageProcessorsByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                type
                state
                stateInSync
            }
        }
    `;

    json response = check executeGraphQL(validQuery, orgDevToken);
    test:assertFalse(response.errors is json,
        "Valid MessageProcessor query (no tracing) should not return schema errors");
}

// =============================================================================
// Test 6: Querying tracing on MessageProcessor fails at the schema level
// This confirms the backend correctly does not expose tracing for MessageProcessor,
// validating that the frontend gqlFields fix (removing 'tracing') is necessary.
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "message-processor-schema"]
}
function testMessageProcessorQueryWithTracingFailsAtSchema() returns error? {
    // Querying a non-existent field on MessageProcessor should produce a GraphQL error
    string invalidQuery = string `
        query {
            messageProcessorsByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}"
            ) {
                name
                tracing
            }
        }
    `;

    json response = check executeGraphQL(invalidQuery, orgDevToken);
    // Ballerina GraphQL rejects queries for undefined fields with a validation error
    test:assertTrue(response.errors is json,
        "Querying 'tracing' on MessageProcessor must return a schema validation error");

    json[] errors = check (check response.errors).ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one error");
}

// =============================================================================
// Test 7: updateArtifactTracingStatus mutation is accepted for template artifact type
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-tracing-mutation"]
}
function testUpdateArtifactTracingStatusForTemplate() returns error? {
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}",
                artifactType: "template",
                artifactName: "${TEMPLATE_OUT_OF_SYNC}",
                trace: "enable"
            }) {
                status
                message
                successCount
                failedCount
            }
        }
    `;

    json response = check executeGraphQL(mutation, orgDevToken);

    // The mutation must not return a schema or server crash error.
    // It may return FAILED (no reachable MI management API in test env), but it must not throw.
    if response.errors is json {
        json[] errors = check (check response.errors).ensureType();
        foreach json err in errors {
            string msg = check (check err.message).ensureType();
            // Explicitly exclude "tracing not supported" errors — template DOES support tracing
            test:assertFalse(msg.includes("does not support tracing"),
                "Template artifact type must be accepted by updateArtifactTracingStatus");
        }
    } else {
        json data = check response.data;
        json result = check data.updateArtifactTracingStatus;
        string status = check (check result.status).ensureType();
        test:assertTrue(status == "SUCCESS" || status == "FAILED",
            "Mutation must return SUCCESS or FAILED (not a schema/type error)");
    }
}

// =============================================================================
// Test 8: updateArtifactTracingStatus requires INTEGRATION_EDIT permission
// =============================================================================

@test:Config {
    groups: ["artifact-tracing", "template-tracing-authz"]
}
function testUpdateTemplateTracingRequiresEditPermission() returns error? {
    // integrationViewerToken has only INTEGRATION_VIEW — not EDIT or MANAGE
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                environmentId: "${DEV_ENV_ID}",
                componentId: "${COMPONENT_1_ID}",
                artifactType: "template",
                artifactName: "${TEMPLATE_OUT_OF_SYNC}",
                trace: "enable"
            }) {
                status
                message
            }
        }
    `;

    json response = check executeGraphQL(mutation, integrationViewerToken);

    // A viewer without edit rights must receive an authorization error
    test:assertTrue(response.errors is json,
        "updateArtifactTracingStatus should reject callers without INTEGRATION_EDIT permission");

    json[] errors = check (check response.errors).ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one permission error");
}

// =============================================================================
// Helpers
// =============================================================================

// Find a JSON artifact object in an array by its 'name' field.
isolated function findArtifactByName(json[] artifacts, string name) returns json? {
    foreach json a in artifacts {
        string|error n = (a.name).ensureType();
        if n is string && n == name {
            return a;
        }
    }
    return ();
}
