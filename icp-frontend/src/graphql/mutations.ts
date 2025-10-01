// Runtime Mutations
export const DELETE_RUNTIME = `
  mutation DeleteRuntime($runtimeId: String!) {
    deleteRuntime(runtimeId: $runtimeId)
  }
`;

// Environment Mutations
export const CREATE_ENVIRONMENT = `
  mutation CreateEnvironment($environment: EnvironmentInput!) {
    createEnvironment(environment: $environment) {
      environmentId
      name
      description
      createdAt
      updatedAt
      updatedBy
      createdBy
    }
  }
`;

export const UPDATE_ENVIRONMENT = `
  mutation UpdateEnvironment($environmentId: String!, $name: String, $description: String) {
    updateEnvironment(environmentId: $environmentId, name: $name, description: $description) {
      environmentId
      name
      description
      createdAt
      updatedAt
      updatedBy
      createdBy
    }
  }
`;

export const DELETE_ENVIRONMENT = `
  mutation DeleteEnvironment($environmentId: String!) {
    deleteEnvironment(environmentId: $environmentId)
  }
`;

// Component Mutations
export const CREATE_COMPONENT = `
  mutation CreateComponent($component: ComponentInput!) {
    createComponent(component: $component) {
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

export const UPDATE_COMPONENT = `
  mutation UpdateComponent($componentId: String!, $name: String, $description: String) {
    updateComponent(componentId: $componentId, name: $name, description: $description) {
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

export const DELETE_COMPONENT = `
  mutation DeleteComponent($componentId: String!) {
    deleteComponent(componentId: $componentId)
  }
`;

// Project Mutations
export const CREATE_PROJECT = `
  mutation CreateProject($project: ProjectInput!) {
    createProject(project: $project) {
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

export const UPDATE_PROJECT = `
  mutation UpdateProject($projectId: String!, $name: String, $description: String) {
    updateProject(projectId: $projectId, name: $name, description: $description) {
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

export const DELETE_PROJECT = `
  mutation DeleteProject($projectId: String!) {
    deleteProject(projectId: $projectId)
  }
`;