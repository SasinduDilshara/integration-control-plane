import {
    createApiRef,
    ConfigApi,
    FetchApi
} from '@backstage/core-plugin-api';
import { Environment } from './EnvironmentsApiService';

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
    component: Component;
    environment: Environment;
    artifacts: Artifacts;
}

export interface RuntimesApi {
    getRuntimes(
        status?: string,
        runtimeType?: string,
        environmentId?: string,
        projectId?: string,
        componentId?: string
    ): Promise<Runtime[]>;
}

export const runtimesApiRef = createApiRef<RuntimesApi>({
    id: 'plugin.runtime-overview.runtimes.service',
});

export class RuntimesApiService implements RuntimesApi {
    constructor(
        private readonly configApi: ConfigApi,
        private readonly fetchApi: FetchApi,
    ) { }

    private async getBaseUrl(): Promise<string> {
        const backendUrl = this.configApi.getString('backend.baseUrl');
        return `${backendUrl}/api/icpbackend`;
    }

    async getRuntimes(
        status?: string,
        runtimeType?: string,
        environmentId?: string,
        projectId?: string,
        componentId?: string
    ): Promise<Runtime[]> {
        const baseUrl = await this.getBaseUrl();

        const params = new URLSearchParams();
        if (status) {
            params.append('status', status);
        }
        if (runtimeType) {
            params.append('runtimeType', runtimeType);
        }
        if (environmentId) {
            params.append('environmentId', environmentId);
        }
        if (projectId) {
            params.append('projectId', projectId);
        }
        if (componentId) {
            params.append('componentId', componentId);
        }

        const url = `${baseUrl}/runtimes${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await this.fetchApi.fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch runtimes: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }
}