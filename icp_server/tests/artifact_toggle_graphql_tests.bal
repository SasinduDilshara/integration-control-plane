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

import ballerina/test;

// Test data IDs from h2_test_data.sql — MI component and artifacts
const string MI_COMPONENT_ID = "640e8400-e29b-41d4-a716-446655440010";
const string MI_RUNTIME_ID = "880e8400-e29b-41d4-a716-446655440010";
const string MI_API_NAME = "TestHealthcareAPI";
const string MI_PROXY_NAME = "TestMainProxy";

// =============================================================================
// Test 1: Enable tracing — mutation succeeds and query reflects new state
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "tracing"]
}
function testEnableTracingImmediatelyReflectedInQuery() returns error? {
    // Step 1: Verify initial state is "disabled"
    string queryStr = string `
        query {
            restApisByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${MI_COMPONENT_ID}"
            ) { name tracing }
        }
    `;

    json queryResp = check executeGraphQL(queryStr, adminToken);
    test:assertFalse(queryResp.errors is json, "Initial query should not error");
    json[] apis = check (check queryResp.data).restApisByEnvironmentAndComponent.ensureType();
    test:assertTrue(apis.length() > 0, "Should have at least one REST API");
    string initialTracing = check apis[0].tracing;
    test:assertEquals(initialTracing, "disabled", "Initial tracing should be disabled");

    // Step 2: Enable tracing via mutation
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "api",
                artifactName: "${MI_API_NAME}",
                trace: "enable"
            }) { status message successCount failedCount }
        }
    `;

    json mutResp = check executeGraphQL(mutation, adminToken);
    test:assertFalse(mutResp.errors is json, "Mutation should not error");
    string status = check (check mutResp.data).updateArtifactTracingStatus.status;
    test:assertEquals(status, "SUCCESS", "Mutation should succeed");

    // Step 3: Immediately re-query — tracing should now be "enabled" (the fix)
    json afterResp = check executeGraphQL(queryStr, adminToken);
    test:assertFalse(afterResp.errors is json, "Post-mutation query should not error");
    json[] afterApis = check (check afterResp.data).restApisByEnvironmentAndComponent.ensureType();
    string afterTracing = check afterApis[0].tracing;
    test:assertEquals(afterTracing, "enabled", "Tracing should be enabled immediately after mutation");
}

// =============================================================================
// Test 2: Disable tracing — mutation succeeds and query reflects new state
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "tracing"],
    dependsOn: [testEnableTracingImmediatelyReflectedInQuery]
}
function testDisableTracingImmediatelyReflectedInQuery() returns error? {
    // Tracing is currently "enabled" from previous test — disable it
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "api",
                artifactName: "${MI_API_NAME}",
                trace: "disable"
            }) { status successCount }
        }
    `;

    json mutResp = check executeGraphQL(mutation, adminToken);
    test:assertFalse(mutResp.errors is json, "Disable mutation should not error");

    // Re-query — tracing should now be "disabled"
    string queryStr = string `
        query {
            restApisByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${MI_COMPONENT_ID}"
            ) { name tracing }
        }
    `;

    json afterResp = check executeGraphQL(queryStr, adminToken);
    json[] apis = check (check afterResp.data).restApisByEnvironmentAndComponent.ensureType();
    string afterTracing = check apis[0].tracing;
    test:assertEquals(afterTracing, "disabled", "Tracing should be disabled immediately after mutation");
}

// =============================================================================
// Test 3: Enable statistics — mutation succeeds and query reflects new state
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "statistics"]
}
function testEnableStatisticsImmediatelyReflectedInQuery() returns error? {
    string mutation = string `
        mutation {
            updateArtifactStatisticsStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "api",
                artifactName: "${MI_API_NAME}",
                statistics: "enable"
            }) { status message successCount failedCount }
        }
    `;

    json mutResp = check executeGraphQL(mutation, adminToken);
    test:assertFalse(mutResp.errors is json, "Statistics mutation should not error");
    string status = check (check mutResp.data).updateArtifactStatisticsStatus.status;
    test:assertEquals(status, "SUCCESS", "Statistics mutation should succeed");

    // Re-query — statistics should now be "enabled"
    string queryStr = string `
        query {
            restApisByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${MI_COMPONENT_ID}"
            ) { name statistics }
        }
    `;

    json afterResp = check executeGraphQL(queryStr, adminToken);
    json[] apis = check (check afterResp.data).restApisByEnvironmentAndComponent.ensureType();
    string afterStats = check apis[0].statistics;
    test:assertEquals(afterStats, "enabled", "Statistics should be enabled immediately after mutation");
}

// =============================================================================
// Test 4: Proxy service tracing toggle reflects immediately
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "tracing"]
}
function testProxyServiceTracingImmediatelyReflected() returns error? {
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "proxy-service",
                artifactName: "${MI_PROXY_NAME}",
                trace: "enable"
            }) { status successCount }
        }
    `;

    json mutResp = check executeGraphQL(mutation, adminToken);
    test:assertFalse(mutResp.errors is json, "Proxy tracing mutation should not error");

    // Re-query proxy services
    string queryStr = string `
        query {
            proxyServicesByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${MI_COMPONENT_ID}"
            ) { name tracing }
        }
    `;

    json afterResp = check executeGraphQL(queryStr, adminToken);
    json[] proxies = check (check afterResp.data).proxyServicesByEnvironmentAndComponent.ensureType();
    test:assertTrue(proxies.length() > 0, "Should have at least one proxy service");
    string afterTracing = check proxies[0].tracing;
    test:assertEquals(afterTracing, "enabled", "Proxy tracing should be enabled immediately after mutation");
}

// =============================================================================
// Test 5: Artifact status (enable/disable) toggle reflects immediately
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "status"]
}
function testArtifactStatusImmediatelyReflected() returns error? {
    // Disable the API artifact
    string mutation = string `
        mutation {
            updateArtifactStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "api",
                artifactName: "${MI_API_NAME}",
                status: "inactive"
            }) { status successCount }
        }
    `;

    json mutResp = check executeGraphQL(mutation, adminToken);
    test:assertFalse(mutResp.errors is json, "Status mutation should not error");

    // Re-query — state should now be "disabled"
    string queryStr = string `
        query {
            restApisByEnvironmentAndComponent(
                environmentId: "${DEV_ENV_ID}",
                componentId: "${MI_COMPONENT_ID}"
            ) { name state }
        }
    `;

    json afterResp = check executeGraphQL(queryStr, adminToken);
    json[] apis = check (check afterResp.data).restApisByEnvironmentAndComponent.ensureType();
    string afterState = check apis[0].state;
    test:assertEquals(afterState, "disabled", "Artifact state should be disabled immediately after mutation");
}

// =============================================================================
// Test 6: Tracing toggle with insufficient permissions returns error
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "tracing", "access-control"]
}
function testTracingToggleNoPermission() returns error? {
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                componentId: "${MI_COMPONENT_ID}",
                artifactType: "api",
                artifactName: "${MI_API_NAME}",
                trace: "enable"
            }) { status }
        }
    `;

    // Integration viewer only has view permission, not edit/manage
    json response = check executeGraphQL(mutation, integrationViewerToken);
    test:assertTrue(response.errors is json, "Should return errors for insufficient permissions");
}

// =============================================================================
// Test 7: Tracing toggle on non-existent component returns error
// =============================================================================

@test:Config {
    groups: ["artifact-toggle", "tracing", "negative"]
}
function testTracingToggleNonExistentComponent() returns error? {
    string mutation = string `
        mutation {
            updateArtifactTracingStatus(input: {
                componentId: "00000000-0000-0000-0000-000000000000",
                artifactType: "api",
                artifactName: "NonExistentAPI",
                trace: "enable"
            }) { status }
        }
    `;

    json response = check executeGraphQL(mutation, adminToken);
    test:assertTrue(response.errors is json, "Should return errors for non-existent component");
}
