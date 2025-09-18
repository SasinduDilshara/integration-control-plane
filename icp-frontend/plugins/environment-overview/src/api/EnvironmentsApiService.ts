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

export interface EnvironmentsApi {
    getEnvironments(): Promise<Environment[]>;
}

export const environmentsApiRef = createApiRef<EnvironmentsApi>({
    id: 'plugin.runtime-overview.environments.service',
});

export class EnvironmentsApiService implements EnvironmentsApi {
    constructor(
        private readonly configApi: ConfigApi,
        private readonly fetchApi: FetchApi,
    ) { }

    private async getBaseUrl(): Promise<string> {
        const backendUrl = this.configApi.getString('backend.baseUrl');
        return `${backendUrl}/api/icpbackend`;
    }

    async getEnvironments(): Promise<Environment[]> {
        const baseUrl = await this.getBaseUrl();

        const response = await this.fetchApi.fetch(`${baseUrl}/environments`);

        if (!response.ok) {
            throw new Error(`Failed to fetch environments: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }
}