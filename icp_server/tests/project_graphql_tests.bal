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
import icp_server.auth;

// Project IDs from test data
const string PROJECT_2_ID = "650e8400-e29b-41d4-a716-446655440002";

// Store tokens (already generated in runtime_graphql_tests.bal)
// - orgDevToken: Org-level Developer (can view/edit, but NOT create projects)
// - project1AdminToken: Project 1 Admin (project-level only)
// - integrationViewerToken: Component 1 viewer

// Additional token for project creation (org-level Admin)
string orgAdminToken = "";

// Store created project ID for cleanup
string createdProjectId = "";

// Setup token for org-level admin (super admin)
@test:BeforeSuite
function setupProjectTests() returns error? {
    // Generate token for super admin (can create projects)
    orgAdminToken = check generateV2Token(
        "550e8400-e29b-41d4-a716-446655440000", // Super admin user ID from test data
        "admin",
        [auth:PERMISSION_PROJECT_MANAGE, auth:PERMISSION_PROJECT_EDIT, auth:PERMISSION_PROJECT_VIEW, auth:PERMISSION_INTEGRATION_MANAGE, auth:PERMISSION_INTEGRATION_EDIT, auth:PERMISSION_INTEGRATION_VIEW]
    );
}

// =============================================================================
// Test 1: Get projects - User with project-level access sees only their projects
// =============================================================================

@test:Config {
    groups: ["project-graphql", "get-projects"]
}
function testGetProjectsFilteredByAccess() returns error? {
    string query = string `
        query {
            projects {
                id
                name
            }
        }
    `;

    json response = check executeGraphQL(query, project1AdminToken);

    // Verify no errors
    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json projectsJson = check data.projects;
    json[] projects = check projectsJson.ensureType();

    // Project admin should NOT see Project 2
    boolean hasProject2 = false;
    foreach json project in projects {
        string projectId = check project.id;
        if projectId == PROJECT_2_ID {
            hasProject2 = true;
        }
    }
    test:assertFalse(hasProject2, "Project 1 admin should not see Project 2");
}

// =============================================================================
// Test 2: Get project by ID - Returns null for no access (404 pattern)
// =============================================================================

@test:Config {
    groups: ["project-graphql", "get-project"]
}
function testGetProjectByIdNoAccess() returns error? {
    string query = string `
        query GetProject($projectId: String!) {
            project(orgId: 1, projectId: $projectId) {
                id
                name
            }
        }
    `;

    // Project 1 admin tries to access Project 2
    json variables = {
        projectId: PROJECT_2_ID
    };

    json response = check executeGraphQL(query, project1AdminToken, variables);

    // Should not return error, but project should be null (404 pattern)
    test:assertFalse(response.errors is json, "Query should not return errors for no access");

    json data = check response.data;
    json? project = check data.project;
    test:assertTrue(project is (), "Should return null for project without access");
}

// =============================================================================
// Test 3: Create project - Success with project_mgt:manage permission
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"]
}
function testCreateProjectSuccess() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
                description
            }
        }
    `;

    json variables = {
        project: {
            name: "test-project-graphql",
            orgHandler: "default",
            projectHandler: "test-project-graphql",
            description: "Test project created by GraphQL test",
            orgId: 1
        }
    };

    json response = check executeGraphQL(mutation, orgAdminToken, variables);

    // Verify no errors - print error if exists for debugging
    if response.errors is json {
        // Print error details for debugging
        json errors = check response.errors;
        // This will fail the test and show the error
        test:assertFail(string `Mutation returned errors: ${errors.toString()}`);
    }

    json data = check response.data;
    json project = check data.createProject;
    
    // Store project ID for potential cleanup
    createdProjectId = check project.id;
    
    string name = check project.name;
    test:assertEquals(name, "test-project-graphql", "Project name should match");
}

// =============================================================================
// Test 4: Create project - Verify admin group and role assignment
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"],
    dependsOn: [testCreateProjectSuccess]
}
function testCreateProjectGroupAssignment() returns error? {
    // Verify project was created in previous test
    test:assertTrue(createdProjectId.length() > 0, "Project ID should be set from previous test");

    // Query to check if user has access to the newly created project
    string query = string `
        query GetProject($projectId: String!) {
            project(orgId: 1, projectId: $projectId) {
                id
                name
            }
        }
    `;

    json variables = {
        projectId: createdProjectId
    };

    json response = check executeGraphQL(query, orgAdminToken, variables);

    // Creator should have immediate access
    test:assertFalse(response.errors is json, "Creator should have access to created project");

    json data = check response.data;
    json|error project = data.project;
    test:assertTrue(project is json, "Creator should see the created project");
}

// =============================================================================
// Test 5: Create project - Fails without project_mgt:manage permission
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"]
}
function testCreateProjectNoPermission() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
            }
        }
    `;

    json variables = {
        project: {
            name: "test-project-unauthorized",
            description: "This should fail",
            orgId: 1
        }
    };

    // Integration viewer only has view permission
    json response = check executeGraphQL(mutation, integrationViewerToken, variables);

    // Should return error
    test:assertTrue(response.errors is json, "Mutation should return errors without permission");

    json[] errors = check response.errors.ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one error");
}

// =============================================================================
// Test 6: Create project - Fails with duplicate handler
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"],
    dependsOn: [testCreateProjectSuccess]
}
function testCreateProjectDuplicateHandler() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
            }
        }
    `;

    // Use a DIFFERENT name but the SAME handler as the project created in testCreateProjectSuccess
    json variables = {
        project: {
            name: "different-name-same-handler",
            orgHandler: "default",
            projectHandler: "test-project-graphql",
            description: "This should fail due to duplicate handler",
            orgId: 1
        }
    };

    json response = check executeGraphQL(mutation, orgAdminToken, variables);

    // Should return error
    test:assertTrue(response.errors is json, "Mutation should return error for duplicate handler");

    json[] errors = check response.errors.ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one error");

    // Verify the error message mentions handler
    string errorMsg = (check errors[0].message).toString().toLowerAscii();
    test:assertTrue(
        errorMsg.includes("handler") && errorMsg.includes("already exists"),
        string `Error should mention handler already exists, got: ${errorMsg}`
    );
}

// =============================================================================
// Test 7: Create project - Fails with duplicate handler from test data
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"]
}
function testCreateProjectDuplicateHandlerFromTestData() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
            }
        }
    `;

    // Use the handler from existing test data project "Sample Project"
    json variables = {
        project: {
            name: "Another Project With Same Handler",
            orgHandler: "default",
            projectHandler: "sample-project",
            description: "This should fail - sample-project handler already exists",
            orgId: 1
        }
    };

    json response = check executeGraphQL(mutation, orgAdminToken, variables);

    // Should return error
    test:assertTrue(response.errors is json, "Mutation should return error for duplicate handler from test data");

    json[] errors = check response.errors.ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one error");

    string errorMsg = (check errors[0].message).toString().toLowerAscii();
    test:assertTrue(
        errorMsg.includes("handler") && errorMsg.includes("already exists"),
        string `Error should mention handler already exists, got: ${errorMsg}`
    );
}

// =============================================================================
// Test 8: Create project - Duplicate handler includes alternate suggestion
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"]
}
function testCreateProjectDuplicateHandlerSuggestion() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
            }
        }
    `;

    json variables = {
        project: {
            name: "Suggestion Test",
            orgHandler: "default",
            projectHandler: "sample-project",
            description: "This should fail and suggest an alternate handler",
            orgId: 1
        }
    };

    json response = check executeGraphQL(mutation, orgAdminToken, variables);

    test:assertTrue(response.errors is json, "Mutation should return error for duplicate handler");

    json[] errors = check response.errors.ensureType();
    string errorMsg = (check errors[0].message).toString();

    // Error message should include an alternate handler suggestion
    test:assertTrue(
        errorMsg.includes("Try"),
        string `Error should include alternate handler suggestion, got: ${errorMsg}`
    );
}

// =============================================================================
// Test 9: Create project - Duplicate name rejected
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"],
    dependsOn: [testCreateProjectSuccess]
}
function testCreateProjectDuplicateName() returns error? {
    string mutation = string `
        mutation CreateProject($project: ProjectInput!) {
            createProject(project: $project) {
                id
                name
            }
        }
    `;

    // Same name as testCreateProjectSuccess but different handler
    json variables = {
        project: {
            name: "test-project-graphql",
            orgHandler: "default",
            projectHandler: "different-handler",
            description: "This should fail due to duplicate name",
            orgId: 1
        }
    };

    json response = check executeGraphQL(mutation, orgAdminToken, variables);

    // Should return error for duplicate name (DB constraint)
    test:assertTrue(response.errors is json, "Mutation should return error for duplicate name");

    json[] errors = check response.errors.ensureType();
    test:assertTrue(errors.length() > 0, "Should have at least one error");

    string errorMsg = (check errors[0].message).toString().toLowerAscii();
    test:assertTrue(
        errorMsg.includes("already exists"),
        string `Error should mention project already exists, got: ${errorMsg}`
    );
}

// =============================================================================
// Test 10: Original project unaffected after duplicate handler attempt
// =============================================================================

@test:Config {
    groups: ["project-graphql", "create-project"],
    dependsOn: [testCreateProjectDuplicateHandlerFromTestData]
}
function testOriginalProjectUnaffectedAfterDuplicateAttempt() returns error? {
    // After the duplicate handler attempt, verify the original project is still accessible
    string query = string `
        query {
            projects {
                id
                name
                handler
            }
        }
    `;

    json response = check executeGraphQL(query, orgAdminToken);

    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json projectsJson = check data.projects;
    json[] projects = check projectsJson.ensureType();

    // Count projects with handler "sample-project" — should be exactly 1
    int sampleProjectCount = 0;
    foreach json project in projects {
        string handler = check project.handler;
        if handler == "sample-project" {
            sampleProjectCount += 1;
        }
    }
    test:assertEquals(sampleProjectCount, 1, "There should be exactly one project with handler 'sample-project'");
}

// =============================================================================
// Test 11: Handler availability - returns false for taken handler
// =============================================================================

@test:Config {
    groups: ["project-graphql", "handler-availability"]
}
function testHandlerAvailabilityTaken() returns error? {
    string query = string `
        query {
            projectHandlerAvailability(orgId: 1, projectHandlerCandidate: "sample-project") {
                handlerUnique
                alternateHandlerCandidate
            }
        }
    `;

    json response = check executeGraphQL(query, orgAdminToken);

    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json availability = check data.projectHandlerAvailability;

    boolean handlerUnique = check availability.handlerUnique;
    test:assertFalse(handlerUnique, "Handler 'sample-project' should not be unique (already taken)");

    // Should provide an alternate suggestion
    json? alternate = check availability.alternateHandlerCandidate;
    test:assertTrue(alternate is string, "Should provide an alternate handler candidate");
}

// =============================================================================
// Test 12: Handler availability - returns true for available handler
// =============================================================================

@test:Config {
    groups: ["project-graphql", "handler-availability"]
}
function testHandlerAvailabilityFree() returns error? {
    string query = string `
        query {
            projectHandlerAvailability(orgId: 1, projectHandlerCandidate: "completely-new-handler") {
                handlerUnique
                alternateHandlerCandidate
            }
        }
    `;

    json response = check executeGraphQL(query, orgAdminToken);

    test:assertFalse(response.errors is json, "Query should not return errors");

    json data = check response.data;
    json availability = check data.projectHandlerAvailability;

    boolean handlerUnique = check availability.handlerUnique;
    test:assertTrue(handlerUnique, "Handler 'completely-new-handler' should be unique (available)");
}

// =============================================================================
// Test 13: Update project - Success with project_mgt:edit permission
// =============================================================================

@test:Config {
    groups: ["project-graphql", "update-project"]
}
function testUpdateProjectSuccess() returns error? {
    string mutation = string `
        mutation UpdateProject($project: ProjectUpdateInput!) {
            updateProject(project: $project) {
                id
                description
            }
        }
    `;

    json variables = {
        project: {
            id: PROJECT_1_ID,
            description: "Updated description for testing"
        }
    };

    json response = check executeGraphQL(mutation, project1AdminToken, variables);

    // Verify no errors
    test:assertFalse(response.errors is json, "Mutation should not return errors");

    json data = check response.data;
    json project = check data.updateProject;
    string description = check project.description;
    test:assertEquals(description, "Updated description for testing", "Description should be updated");
}

// =============================================================================
// Test 14: Delete project - Fails without project_mgt:manage permission
// =============================================================================

@test:Config {
    groups: ["project-graphql", "delete-project"]
}
function testDeleteProjectNoPermission() returns error? {
    string mutation = string `
        mutation DeleteProject($projectId: String!) {
            deleteProject(orgId: 1, projectId: $projectId) {
                status
                details
            }
        }
    `;

    json variables = {
        projectId: PROJECT_1_ID
    };

    // Integration viewer doesn't have manage permission
    json response = check executeGraphQL(mutation, integrationViewerToken, variables);

    // Should return error
    test:assertTrue(response.errors is json, "Mutation should return errors without manage permission");
}
