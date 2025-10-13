// GraphQL Input Types
export interface CreateRuntimeInput {
    runtimeType: string;
    description: string;
    environmentId: string;
    componentId: string;
}

export interface CreateEnvironmentInput {
    name: string;
    description: string;
    isProduction: boolean;
}

export interface UpdateEnvironmentInput {
    environmentId: string;
    name: string;
    description: string;
    isProduction: boolean;
}

export interface CreateComponentInput {
    name: string;
    description: string;
    projectId: string;
}

export interface UpdateComponentInput {
    componentId: string;
    name: string;
    description: string;
    projectId: string;
}

export interface CreateProjectInput {
    name: string;
    description: string;
}

export interface UpdateProjectInput {
    projectId: string;
    name: string;
    description: string;
}

// GraphQL Response Types
export interface RuntimesQueryResponse {
    runtimes: Runtime[];
}

export interface EnvironmentsQueryResponse {
    environments: Environment[];
}

export interface ComponentsQueryResponse {
    components: Component[];
}

export interface ProjectsQueryResponse {
    projects: Project[];
}

export interface CreateRuntimeMutationResponse {
    createRuntime: Runtime;
}

export interface CreateEnvironmentMutationResponse {
    createEnvironment: Environment;
}

export interface UpdateEnvironmentMutationResponse {
    updateEnvironment: Environment;
}

export interface CreateComponentMutationResponse {
    createComponent: Component;
}

export interface UpdateComponentMutationResponse {
    updateComponent: Component;
}

export interface CreateProjectMutationResponse {
    createProject: Project;
}

export interface UpdateProjectMutationResponse {
    updateProject: Project;
}

export interface DeleteMutationResponse {
    success: boolean;
    message: string;
}

// Import base types
import { Runtime, Environment, Component, Project } from '../types';