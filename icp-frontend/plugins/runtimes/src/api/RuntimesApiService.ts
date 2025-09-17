import {
    createApiRef,
    ConfigApi,
    FetchApi
} from '@backstage/core-plugin-api';

export interface Environment {
    environmentId: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    createdBy: string;
}

export interface Project {
    projectId: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}

export interface Component {
    componentId: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    project: Project;
}

export interface Listener {
    name: string;
    package: string;
    protocol: string;
    state: string;
}

export interface Resource {
    methods: string;
    url: string;
}

export interface Service {
    name: string;
    package: string;
    basePath: string;
    state: string;
    resources: Resource[];
}

export interface Artifacts {
    listeners: Listener[];
    services: Service[];
}

export interface Runtime {
    runtimeId: string;
    runtimeType: string;
    status: string;
    version: string;
    platformName: string;
    platformVersion: string;
    platformHome: string;
    osName: string;
    osVersion: string;
    registrationTime: string;
    lastHeartbeat: string;
    environment: Environment;
    component: Component;
    artifacts: Artifacts;
}

export interface RuntimesApi {
    getRuntimes(filters?: {
        status?: string;
        runtimeType?: string;
        environment?: string;
        projectId?: string;
        componentId?: string;
    }): Promise<Runtime[]>;
    getProjects(): Promise<Project[]>;
    getEnvironments(): Promise<Environment[]>;
    getComponents(projectId: string): Promise<Component[]>;
}

export const runtimesApiRef = createApiRef<RuntimesApi>({
    id: 'plugin.runtimes.service',
});

export class RuntimesApiService implements RuntimesApi {
    constructor(
        private readonly configApi: ConfigApi,
        private readonly fetchApi: FetchApi,
    ) { }

    private async request<T>(query: string, variables?: Record<string, any>): Promise<T> {
        let proxyUrl = '';
        let response: Response;
        let lastError: Error;

        try {
            const baseUrl = 'http://localhost:9446'
            proxyUrl = `${baseUrl}/graphql`;

            response = await this.fetchApi.fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });

            if (response.ok) {
                const json = await response.json();
                if (json.errors) {
                    throw new Error(`GraphQL Error: ${json.errors[0].message}`);
                }
                return json.data;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (proxyError) {
            lastError = proxyError as Error;
            console.warn('Proxy endpoint failed, trying direct connection:', proxyError);

            // Fallback to proxy-based approach
            try {
                const backendUrl = this.configApi.getString('backend.baseUrl');
                proxyUrl = `${backendUrl}/api/proxy/icp/graphql`;

                response = await this.fetchApi.fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        variables,
                    }),
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json.errors) {
                        throw new Error(`GraphQL Error: ${json.errors[0].message}`);
                    }
                    return json.data;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (fallbackError) {
                console.error('Both direct and proxy requests failed:', { lastError, fallbackError });
                throw lastError;
            }
        }
    }

    async getRuntimes(filters?: {
        status?: string;
        runtimeType?: string;
        environment?: string;
        projectId?: string;
        componentId?: string;
    }): Promise<Runtime[]> {
        const query = `
            query Runtimes($status: String, $runtimeType: String, $environment: String, $projectId: String, $componentId: String) {
                runtimes(
                    status: $status
                    runtimeType: $runtimeType
                    environment: $environment
                    projectId: $projectId
                    componentId: $componentId
                ) {
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

        const data = await this.request<{ runtimes: Runtime[] }>(
            query,
            filters || {}
        );
        return data.runtimes || [];
    }

    async getProjects(): Promise<Project[]> {
        const query = `
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

        const data = await this.request<{ projects: Project[] }>(query);
        return data.projects || [];
    }

    async getEnvironments(): Promise<Environment[]> {
        const query = `
            query GetEnvironments {
                environments {
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

        const data = await this.request<{ environments: Environment[] }>(query);
        return data.environments || [];
    }

    async getComponents(projectId: string): Promise<Component[]> {
        const query = `
            query GetComponents($projectId: String!) {
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

        const data = await this.request<{ components: Component[] }>(
            query,
            { projectId }
        );
        return data.components || [];
    }
}