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
import ballerina/jwt;
import ballerina/log;
import ballerina/test;

// Test configuration
const string AUTH_V2_SERVICE_URL = "https://localhost:9445";
const string SUPER_ADMIN_USERNAME = "admin";
const string SUPER_ADMIN_PASSWORD = "admin";
const string DEFAULT_ORG_HANDLE = "default";

// HTTP client for testing
final http:Client authV2Client = check new (AUTH_V2_SERVICE_URL,
    secureSocket = {
        cert: {
            path: truststorePath,
            password: truststorePassword
        }
    }
);

// Store tokens and IDs for use across tests
string superAdminToken = "";
string testGroupId = "";
string testRoleId = "";

// =============================================================================
// Test 1: Login as Super Admin and Verify V2 JWT
// =============================================================================

@test:Config {
    groups: ["auth-v2", "login"]
}
function testSuperAdminLoginWithV2JWT() returns error? {
    // Prepare login request
    json loginRequest = {
        username: SUPER_ADMIN_USERNAME,
        password: SUPER_ADMIN_PASSWORD
    };

    // Send login request
    http:Response response = check authV2Client->post("/auth/login", loginRequest);

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for successful login");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert V2 response structure includes permissions array
    test:assertTrue(responseBody.token is string, "Token should be present in response");
    test:assertTrue(responseBody.permissions is json[], "Permissions array should be present in response");
    test:assertTrue(responseBody.username is string, "Username should be present in response");

    // Store token for subsequent tests
    superAdminToken = check responseBody.token;
    test:assertTrue(superAdminToken.length() > 0, "Token should not be empty");
    log:printInfo("JWT Token: " + superAdminToken);

    // Decode and verify JWT token
    [jwt:Header, jwt:Payload] [_, payload] = check jwt:decode(superAdminToken);

    // Verify JWT claims
    test:assertTrue(payload.sub is string, "Subject should be present in JWT");
    test:assertTrue(payload["username"] is string, "Username should be present in JWT");
    test:assertEquals(payload["username"], SUPER_ADMIN_USERNAME, "Username should match");

    // Verify V2 JWT structure - permissions in scope claim
    test:assertTrue(payload["scope"] is string, "Scope claim should be present in V2 JWT");
    string scopeClaim = check payload["scope"].ensureType();
    test:assertTrue(scopeClaim.includes("user_mgt:manage_users"), "Should have user management permission in scope");
    test:assertTrue(scopeClaim.includes("user_mgt:manage_groups"), "Should have group management permission in scope");
    test:assertTrue(scopeClaim.includes("user_mgt:manage_roles"), "Should have role management permission in scope");

    // Verify permissions in response body (not in token - only scope claim is used)
    json[] permissionsJsonArray = check responseBody.permissions.ensureType();
    test:assertTrue(permissionsJsonArray.length() > 0, "Permissions array in response should not be empty");
    
    // Verify that all permissions in response are also represented in the scope claim
    foreach json permJson in permissionsJsonArray {
        string permName = check permJson.ensureType();
        test:assertTrue(scopeClaim.includes(permName), string `Permission ${permName} should be in scope claim`);
    }
}

// =============================================================================
// Test 2: Group Management Endpoints
// =============================================================================

@test:Config {
    groups: ["auth-v2", "groups"],
    dependsOn: [testSuperAdminLoginWithV2JWT]
}
function testCreateGroup() returns error? {
    // Prepare create group request
    json groupRequest = {
        groupName: "Test Group V2",
        description: "Test group for RBAC V2"
    };

    // Send create group request
    http:Response response = check authV2Client->post(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups`,
        groupRequest,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 201, "Expected status code 201 for group creation");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.groupId is string, "Group ID should be present");
    test:assertTrue(responseBody.groupName is string, "Group name should be present");
    test:assertEquals(responseBody.groupName, "Test Group V2", "Group name should match");

    // Store group ID for subsequent tests
    testGroupId = check responseBody.groupId;
}

@test:Config {
    groups: ["auth-v2", "groups"],
    dependsOn: [testCreateGroup]
}
function testGetGroupById() returns error? {
    // Send get group request
    http:Response response = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for get group");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertEquals(responseBody.groupId, testGroupId, "Group ID should match");
    test:assertEquals(responseBody.groupName, "Test Group V2", "Group name should match");
    test:assertTrue(responseBody.description is string, "Description should be present");
}

@test:Config {
    groups: ["auth-v2", "groups"],
    dependsOn: [testGetGroupById]
}
function testListGroups() returns error? {
    // Send list groups request
    http:Response response = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for list groups");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response is an array
    test:assertTrue(responseBody is json[], "Response should be an array");
    json[] groups = check responseBody.ensureType();
    test:assertTrue(groups.length() > 0, "Should return at least one group");

    // Verify our test group is in the list
    boolean foundTestGroup = false;
    foreach json group in groups {
        if group.groupId == testGroupId {
            foundTestGroup = true;
            break;
        }
    }
    test:assertTrue(foundTestGroup, "Test group should be in the list");
}

@test:Config {
    groups: ["auth-v2", "groups"],
    dependsOn: [testListGroups]
}
function testUpdateGroup() returns error? {
    // Prepare update group request
    json updateRequest = {
        groupName: "Updated Test Group V2",
        description: "Updated description"
    };

    // Send update group request
    http:Response response = check authV2Client->put(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}`,
        updateRequest,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for group update");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert updated values
    test:assertEquals(responseBody.groupName, "Updated Test Group V2", "Group name should be updated");
    test:assertEquals(responseBody.description, "Updated description", "Description should be updated");
}

// =============================================================================
// Test 2.5: Group-User Mapping Endpoints
// =============================================================================

@test:Config {
    groups: ["auth-v2", "group-users"],
    dependsOn: [testCreateGroup, testSuperAdminLoginWithV2JWT]
}
function testAddUsersToGroup() returns error? {
    // Prepare add users request
    json addUsersRequest = {
        userIds: [SUPER_ADMIN_USER_ID] // Add super admin to the test group
    };

    // Send add users request
    http:Response response = check authV2Client->post(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}/users`,
        addUsersRequest,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for adding users to group");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.message is string, "Message should be present");
    test:assertEquals(responseBody.successCount, 1, "Success count should be 1");
    test:assertEquals(responseBody.failureCount, 0, "Failure count should be 0");
}

@test:Config {
    groups: ["auth-v2", "group-users"],
    dependsOn: [testAddUsersToGroup]
}
function testRemoveUserFromGroup() returns error? {
    // Send remove user request
    http:Response response = check authV2Client->delete(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}/users/${SUPER_ADMIN_USER_ID}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for removing user from group");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.message is string, "Message should be present");
    test:assertEquals(responseBody.userId, SUPER_ADMIN_USER_ID, "User ID should match");
    test:assertEquals(responseBody.groupId, testGroupId, "Group ID should match");
}

// =============================================================================
// Test 3: Role Management Endpoints
// =============================================================================

@test:Config {
    groups: ["auth-v2", "roles"],
    dependsOn: [testSuperAdminLoginWithV2JWT]
}
function testCreateRole() returns error? {
    // Prepare create role request
    json roleRequest = {
        roleName: "Test Role V2",
        description: "Test role for RBAC V2",
        permissionIds: [] // Empty for now
    };

    // Send create role request
    http:Response response = check authV2Client->post(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles`,
        roleRequest,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 201, "Expected status code 201 for role creation");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.roleId is string, "Role ID should be present");
    test:assertTrue(responseBody.roleName is string, "Role name should be present");
    test:assertEquals(responseBody.roleName, "Test Role V2", "Role name should match");
    test:assertTrue(responseBody.orgId is int, "Org ID should be present");

    // Store role ID for subsequent tests
    testRoleId = check responseBody.roleId;
}

@test:Config {
    groups: ["auth-v2", "roles"],
    dependsOn: [testCreateRole]
}
function testGetRoleById() returns error? {
    // Send get role request
    http:Response response = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles/${testRoleId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for get role");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertEquals(responseBody.roleId, testRoleId, "Role ID should match");
    test:assertEquals(responseBody.roleName, "Test Role V2", "Role name should match");
    test:assertTrue(responseBody.permissions is json[], "Permissions array should be present");
}

@test:Config {
    groups: ["auth-v2", "roles"],
    dependsOn: [testGetRoleById]
}
function testListRoles() returns error? {
    // Send list roles request
    http:Response response = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for list roles");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response is an array
    test:assertTrue(responseBody is json[], "Response should be an array");
    json[] roles = check responseBody.ensureType();
    test:assertTrue(roles.length() > 0, "Should return at least one role");

    // Verify our test role is in the list
    boolean foundTestRole = false;
    foreach json role in roles {
        if role.roleId == testRoleId {
            foundTestRole = true;
            break;
        }
    }
    test:assertTrue(foundTestRole, "Test role should be in the list");
}

@test:Config {
    groups: ["auth-v2", "roles"],
    dependsOn: [testListRoles]
}
function testUpdateRole() returns error? {
    // Prepare update role request
    json updateRequest = {
        roleName: "Updated Test Role V2",
        description: "Updated role description",
        permissionIds: []
    };

    // Send update role request
    http:Response response = check authV2Client->put(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles/${testRoleId}`,
        updateRequest,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for role update");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert updated values
    test:assertEquals(responseBody.roleName, "Updated Test Role V2", "Role name should be updated");
    test:assertEquals(responseBody.description, "Updated role description", "Description should be updated");
}

// =============================================================================
// Test 4: Permission Endpoints
// =============================================================================

@test:Config {
    groups: ["auth-v2", "permissions"],
    dependsOn: [testSuperAdminLoginWithV2JWT]
}
function testListAllPermissions() returns error? {
    // Send list permissions request (no org scope - tenant-agnostic)
    http:Response response = check authV2Client->get(
        "/auth/permissions",
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for list permissions");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.groupedByDomain is map<json>, "Response should contain groupedByDomain");
    map<json> permissionsByDomain = check responseBody.groupedByDomain.ensureType();
    
    // Verify expected domains are present
    test:assertTrue(permissionsByDomain["User-Management"] is json[], "User-Management domain should be present");
    test:assertTrue(permissionsByDomain["Integration-Management"] is json[], "Integration-Management domain should be present");
    test:assertTrue(permissionsByDomain["Project-Management"] is json[], "Project-Management domain should be present");

    // Verify permissions structure
    json[] userMgtPermissions = check permissionsByDomain["User-Management"].ensureType();
    test:assertTrue(userMgtPermissions.length() > 0, "User-Management should have permissions");

    // Verify each permission has required fields
    json firstPermission = userMgtPermissions[0];
    test:assertTrue(firstPermission.permissionId is string, "Permission should have ID");
    test:assertTrue(firstPermission.permissionName is string, "Permission should have name");
    test:assertTrue(firstPermission.permissionDomain is string, "Permission should have domain");
}

@test:Config {
    groups: ["auth-v2", "permissions"],
    dependsOn: [testSuperAdminLoginWithV2JWT]
}
function testGetUserEffectivePermissions() returns error? {
    // Get admin user ID from token
    [jwt:Header, jwt:Payload] [_, payload] = check jwt:decode(superAdminToken);
    string? userIdOptional = payload.sub;
    test:assertTrue(userIdOptional is string, "User ID should be present in JWT");
    string userId = <string>userIdOptional;

    // Send get user permissions request (org-scoped)
    http:Response response = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/users/${userId}/permissions`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for get user permissions");

    // Parse response body
    json responseBody = check response.getJsonPayload();

    // Assert response structure
    test:assertTrue(responseBody.permissions is json[], "Permissions array should be present");
    test:assertTrue(responseBody.permissionNames is json[], "Permission names array should be present");

    // Verify super admin has all permissions
    json[] permissions = check responseBody.permissions.ensureType();
    test:assertTrue(permissions.length() > 0, "Super admin should have permissions");

    json[] permissionNames = check responseBody.permissionNames.ensureType();
    test:assertTrue(permissionNames.length() > 0, "Permission names should not be empty");
    
    // Verify super admin has user management permissions
    string permissionNamesStr = permissionNames.toString();
    test:assertTrue(permissionNamesStr.includes("user_mgt:manage_users"), "Should have user management permission");
    test:assertTrue(permissionNamesStr.includes("user_mgt:manage_groups"), "Should have group management permission");
    test:assertTrue(permissionNamesStr.includes("user_mgt:manage_roles"), "Should have role management permission");
}

// =============================================================================
// Cleanup: Delete Test Resources
// =============================================================================

@test:Config {
    groups: ["auth-v2", "cleanup"],
    dependsOn: [testUpdateGroup, testUpdateRole]
}
function testDeleteGroup() returns error? {
    // Send delete group request
    http:Response response = check authV2Client->delete(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for group deletion");

    // Verify group is deleted - trying to get it should return 404
    http:Response getResponse = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/groups/${testGroupId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );
    test:assertEquals(getResponse.statusCode, 404, "Group should not exist after deletion");
}

@test:Config {
    groups: ["auth-v2", "cleanup"],
    dependsOn: [testUpdateRole]
}
function testDeleteRole() returns error? {
    // Send delete role request
    http:Response response = check authV2Client->delete(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles/${testRoleId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );

    // Assert response status
    test:assertEquals(response.statusCode, 200, "Expected status code 200 for role deletion");

    // Verify role is deleted - trying to get it should return 404
    http:Response getResponse = check authV2Client->get(
        string `/auth/orgs/${DEFAULT_ORG_HANDLE}/roles/${testRoleId}`,
        headers = {"Authorization": string `Bearer ${superAdminToken}`}
    );
    test:assertEquals(getResponse.statusCode, 404, "Role should not exist after deletion");
}
