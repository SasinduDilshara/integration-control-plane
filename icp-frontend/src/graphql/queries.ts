// Runtime Queries
export const GET_RUNTIMES = `
  query GetRuntimes($status: String, $runtimeType: String, $environmentId: String, $projectId: String, $componentId: String) {
    runtimes(status: $status, runtimeType: $runtimeType, environmentId: $environmentId, projectId: $projectId, componentId: $componentId) {
      runtimeId
      runtimeType
      status
      version
      platformName
      platformVersion
      platformHome
      osName
      osVersion
      registrationTime
      lastHeartbeat
      environment {
        environmentId
        name
        description
        isProduction
        createdAt
        updatedAt
        updatedBy
        createdBy
      }
      component {
        componentId
        name
        description
        createdBy
        createdAt
        updatedAt
        updatedBy
        project {
          projectId
          name
          description
          createdBy
          createdAt
          updatedAt
          updatedBy
        }
      }
      artifacts {
        listeners {
          name
          package
          protocol
          state
        }
        services {
          name
          package
          basePath
          state
          resources {
            methods
            url
          }
        }
      }
    }
  }
`;

export const GET_RUNTIME = `
  query GetRuntime($runtimeId: String!) {
    runtime(runtimeId: $runtimeId) {
      runtimeId
      runtimeType
      status
      version
      platformName
      platformVersion
      platformHome
      osName
      osVersion
      registrationTime
      lastHeartbeat
      environment {
        environmentId
        name
        description
        isProduction
        createdAt
        updatedAt
        updatedBy
        createdBy
      }
      component {
        componentId
        name
        description
        createdBy
        createdAt
        updatedAt
        updatedBy
        project {
          projectId
          name
          description
          createdBy
          createdAt
          updatedAt
          updatedBy
        }
      }
      artifacts {
        listeners {
          name
          package
          protocol
          state
        }
        services {
          name
          package
          basePath
          state
          resources {
            methods
            url
          }
        }
      }
    }
  }
`;

// Environment Queries
export const GET_ENVIRONMENTS = `
  query GetEnvironments {
    environments {
      environmentId
      name
      description
      isProduction
      createdAt
      updatedAt
      updatedBy
      createdBy
    }
  }
`;

// Component Queries
export const GET_COMPONENTS = `
  query GetComponents($projectId: String) {
    components(projectId: $projectId) {
      componentId
      name
      description
      createdBy
      createdAt
      updatedAt
      updatedBy
      project {
        projectId
        name
        description
        createdBy
        createdAt
        updatedAt
        updatedBy
      }
    }
  }
`;

export const GET_COMPONENT = `
  query GetComponent($componentId: String!) {
    component(componentId: $componentId) {
      componentId
      name
      description
      createdBy
      createdAt
      updatedAt
      updatedBy
      project {
        projectId
        name
        description
        createdBy
        createdAt
        updatedAt
        updatedBy
      }
    }
  }
`;

// Project Queries
export const GET_PROJECTS = `
  query GetProjects {
    projects {
      projectId
      name
      description
      createdBy
      createdAt
      updatedAt
      updatedBy
    }
  }
`;

export const GET_PROJECT = `
  query GetProject($projectId: String!) {
    project(projectId: $projectId) {
      projectId
      name
      description
      createdBy
      createdAt
      updatedAt
      updatedBy
    }
  }
`;

// Admin Project Queries (for permission management)
export const GET_ADMIN_PROJECTS = `
  query GetAdminProjects {
    adminProjects {
      projectId
      name
      description
      createdBy
      createdAt
      updatedAt
      updatedBy
    }
  }
`;

export const GET_ADMIN_ENVIRONMENTS = `
  query GetAdminEnvironments {
    adminEnvironments {
      environmentId
      name
      description
      isProduction
      createdAt
      updatedAt
      updatedBy
      createdBy
    }
  }
`;