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
    deleteRuntime(runtimeId: string): Promise<void>;
}

export const runtimesApiRef = createApiRef<RuntimesApi>({
    id: 'plugin.runtimes.service',
});

export class RuntimesApiService implements RuntimesApi {
    constructor(
        private readonly configApi: ConfigApi,
        private readonly fetchApi: FetchApi,
    ) { }

    private async restRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const backendUrl = this.configApi.getOptionalString('backend.baseUrl') || '';
        const url = `${backendUrl}/api/icpbackend${endpoint}`;

        const response = await this.fetchApi.fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        // Handle empty responses (e.g., from DELETE operations)
        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    async getRuntimes(filters?: {
        status?: string;
        runtimeType?: string;
        environment?: string;
        projectId?: string;
        componentId?: string;
    }): Promise<Runtime[]> {
        let endpoint = '/runtimes';

        if (filters) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, value);
                }
            });

            if (params.toString()) {
                endpoint += `?${params.toString()}`;
            }
        }

        return this.restRequest<Runtime[]>(endpoint);
    }

    async getProjects(): Promise<Project[]> {
        return this.restRequest<Project[]>('/projects');
    }

    async getEnvironments(): Promise<Environment[]> {
        return this.restRequest<Environment[]>('/environments');
    }

    async getComponents(projectId: string): Promise<Component[]> {
        const endpoint = projectId ? `/components?projectId=${encodeURIComponent(projectId)}` : '/components';
        return this.restRequest<Component[]>(endpoint);
    }

    async deleteRuntime(runtimeId: string): Promise<void> {
        // Use REST endpoint that calls the backend ICPApiService delete method
        return this.restRequest<void>(`/runtimes/${encodeURIComponent(runtimeId)}`, {
            method: 'DELETE',
        });
    }
}