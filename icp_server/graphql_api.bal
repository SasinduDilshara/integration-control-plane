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

import ballerina/graphql;

// GraphQL listener configuration
listener graphql:Listener graphqlListener = new (graphqlPort,
    secureSocket = {
        key: {
            path: keystorePath,
            password: keystorePassword
        }
    }
);

// GraphQL service for runtime details
service /graphql on graphqlListener {
    // ----------- Runtime Resources
    // Get all runtimes with optional filtering
    isolated resource function get runtimes(string? status, string? runtimeType, string? environment) returns types:Runtime[]|error {
        return check storage:getRuntimes(status, runtimeType, environment);
    }

    // Get a specific runtime by ID
    isolated resource function get runtime(string runtimeId) returns types:Runtime?|error {
        return check storage:getRuntimeById(runtimeId);
    }

    // Get services for a specific runtime
    isolated resource function get services(string runtimeId) returns types:Service[]|error {
        return check storage:getServicesForRuntime(runtimeId);
    }

    // Get listeners for a specific runtime
    isolated resource function get listeners(string runtimeId) returns types:Listener[]|error {
        return check storage:getListenersForRuntime(runtimeId);
    }

    // ----------- Environment Resources
    // Create a new environment
    isolated remote function createEnvironment(types:EnvironmentInput environment) returns boolean|error {
        // Call storage layer to insert environments
        check storage:insertEnvironmentToDB(environment);
        return true;
    }

    // Get all environments
    isolated resource function get environments() returns types:Environment[]|error {
        return check storage:getEnvironments();
    }

    //------------- Project Resources
    // Create a new project
    isolated remote function createProject(types:ProjectInput project) returns boolean|error {
        check storage:createProject(project);
        return true;
    }

    // Get all projects
    isolated resource function get projects() returns types:Project[]|error {
        return check storage:getProjects();
    }

    // Get a specific project by ID
    isolated resource function get project(string projectId) returns types:Project?|error {
        return check storage:getProjectById(projectId);
    }

    // ----------- Component Resources
    // Create a new component
    isolated remote function createComponent(types:ComponentInput component) returns boolean|error {
        check storage:createComponent(component);
        return true;
    }

    // Get all components with optional project filter
    isolated resource function get components(string? projectId) returns types:Component[]|error {
        return check storage:getComponents(projectId);
    }

    // Get a specific component by ID
    isolated resource function get component(string componentId) returns types:Component?|error {
        return check storage:getComponentById(componentId);
    }
}
