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

import ballerina/http;
import ballerina/log;
import ballerina/test;

// Regression tests for GitHub issue #253:
// Empty Bearer token must not crash the ICP server.
// The observability service uses declarative JWT auth via @http:ServiceConfig.
// These tests verify that malformed Authorization headers are rejected with
// 401 Unauthorized and that the server remains responsive afterwards.

const string OBSERVABILITY_URL = "https://localhost:9448";

final http:Client observabilityTestClient = check new (OBSERVABILITY_URL,
    secureSocket = {
        cert: {
            path: truststorePath,
            password: truststorePassword
        }
    }
);

// Minimal valid request body for POST /icp/observability/logs
final json logRequestPayload = {
    "query": "*",
    "from": 0,
    "size": 10
};

// =============================================================================
// Test: Empty Bearer token returns 401 (issue #253 regression)
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative", "regression"]
}
function testEmptyBearerTokenReturns401() returns error? {
    log:printInfo("Test: Empty Bearer token on observability endpoint (issue #253)");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": "Bearer "
    });

    assertStatusCode(response.statusCode, 401, "Empty Bearer token should return 401, not 500");

    log:printInfo("Test passed: Empty Bearer token correctly rejected with 401");
}

// =============================================================================
// Test: Bearer keyword with no trailing space returns 401
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative"]
}
function testBearerNoSpaceReturns401() returns error? {
    log:printInfo("Test: 'Bearer' with no space on observability endpoint");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": "Bearer"
    });

    assertStatusCode(response.statusCode, 401, "'Bearer' with no token should return 401");

    log:printInfo("Test passed: 'Bearer' without space correctly rejected with 401");
}

// =============================================================================
// Test: Empty Authorization header returns 401
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative"]
}
function testEmptyAuthorizationHeaderReturns401() returns error? {
    log:printInfo("Test: Empty Authorization header on observability endpoint");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": ""
    });

    assertStatusCode(response.statusCode, 401, "Empty Authorization header should return 401");

    log:printInfo("Test passed: Empty Authorization header correctly rejected with 401");
}

// =============================================================================
// Test: Missing Authorization header returns 401
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative"]
}
function testMissingAuthorizationHeaderReturns401() returns error? {
    log:printInfo("Test: Missing Authorization header on observability endpoint");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload);

    assertStatusCode(response.statusCode, 401, "Missing Authorization header should return 401");

    log:printInfo("Test passed: Missing Authorization header correctly rejected with 401");
}

// =============================================================================
// Test: Wrong auth scheme (Basic instead of Bearer) returns 401
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative"]
}
function testWrongAuthSchemeReturns401() returns error? {
    log:printInfo("Test: Basic auth scheme on observability endpoint");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": "Basic dXNlcjpwYXNz"
    });

    assertStatusCode(response.statusCode, 401, "Basic auth scheme should return 401 on JWT-protected endpoint");

    log:printInfo("Test passed: Wrong auth scheme correctly rejected with 401");
}

// =============================================================================
// Test: Invalid JWT token returns 401
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative"]
}
function testInvalidJwtTokenReturns401() returns error? {
    log:printInfo("Test: Invalid JWT token on observability endpoint");

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid-signature"
    });

    assertStatusCode(response.statusCode, 401, "Invalid JWT should return 401");

    log:printInfo("Test passed: Invalid JWT correctly rejected with 401");
}

// =============================================================================
// Test: Server remains responsive after multiple malformed auth requests
// =============================================================================

@test:Config {
    groups: ["observability-auth", "negative", "regression"]
}
function testServerStableAfterMalformedAuthRequests() returns error? {
    log:printInfo("Test: Server stability after multiple malformed auth requests (issue #253)");

    // Send a batch of malformed requests
    string[] malformedHeaders = [
        "Bearer ",
        "Bearer",
        "",
        "Basic dXNlcjpwYXNz",
        "Bearer  ",
        "bearer ",
        "BEARER "
    ];

    foreach string header in malformedHeaders {
        http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
            "Authorization": header
        });
        test:assertTrue(
            response.statusCode == 401,
            string `Expected 401 for malformed header '${header}' but got ${response.statusCode}`
        );
    }

    // Verify server is still responsive by sending a request without auth header
    http:Response finalResponse = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload);
    assertStatusCode(finalResponse.statusCode, 401,
        "Server should still be responsive after malformed auth requests");

    log:printInfo("Test passed: Server remained stable after all malformed auth requests");
}

// =============================================================================
// Test: Valid token is accepted on observability endpoint
// =============================================================================

@test:Config {
    groups: ["observability-auth"]
}
function testValidTokenAcceptedOnObservabilityEndpoint() returns error? {
    log:printInfo("Test: Valid token is accepted on observability endpoint");

    string authHeader = createAuthHeader(adminToken);

    http:Response response = check observabilityTestClient->post("/icp/observability/logs", logRequestPayload, {
        "Authorization": authHeader
    });

    // A valid token should pass auth. The response may be 200 (with results) or 503
    // (if observability backend is not configured), but it must NOT be 401.
    test:assertTrue(
        response.statusCode != 401,
        string `Valid admin token should pass auth but got 401`
    );

    log:printInfo(string `Test passed: Valid token accepted, response status: ${response.statusCode}`);
}
