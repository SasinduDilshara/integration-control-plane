import {
    EntityProvider,
    EntityProviderConnection
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { Logger } from 'winston';
import { ICPApiService } from '../services/ICPApiService/types';

/**
 * ICP Entity Provider that syncs ICP projects, components, environments, and runtimes
 * to the Backstage catalog as entities.
 */
export class ICPEntityProvider implements EntityProvider {
    private readonly logger: Logger;
    private readonly icpApiService: ICPApiService;
    private connection?: EntityProviderConnection;

    constructor(
        logger: Logger,
        icpApiService: ICPApiService,
    ) {
        this.logger = logger;
        this.icpApiService = icpApiService;
    }

    getProviderName(): string {
        return 'ICPEntityProvider';
    }

    async connect(connection: EntityProviderConnection): Promise<void> {
        this.connection = connection;
        await this.run();
    }

    async run(): Promise<void> {
        if (!this.connection) {
            throw new Error('Not initialized');
        }

        this.logger.info('Discovering ICP entities');

        try {
            const entities = await this.discoverEntities();
            await this.connection.applyMutation({
                type: 'full',
                entities: entities.map(entity => ({
                    entity,
                    locationKey: 'icp-provider',
                })),
            });

            this.logger.info(`Discovered ${entities.length} ICP entities`);
        } catch (error) {
            this.logger.error('Failed to discover ICP entities', error);
        }
    }

    private async discoverEntities(): Promise<Entity[]> {
        const entities: Entity[] = [];

        // Discover Projects as Systems
        const projects = await this.icpApiService.getProjects();
        for (const project of projects) {
            entities.push({
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'System',
                metadata: {
                    name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    title: project.name,
                    description: project.description,
                    annotations: {
                        'icp.wso2.com/project-id': project.projectId,
                        'icp.wso2.com/created-by': project.createdBy,
                        'icp.wso2.com/created-at': project.createdAt,
                    },
                },
                spec: {
                    owner: project.createdBy,
                    domain: 'integration',
                },
            });
        }

        // Discover Components
        const allComponents = await this.icpApiService.getComponents();
        for (const component of allComponents) {
            const projectName = component.project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

            entities.push({
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Component',
                metadata: {
                    name: component.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    title: component.name,
                    description: component.description,
                    annotations: {
                        'icp.wso2.com/component-id': component.componentId,
                        'icp.wso2.com/project-id': component.project.projectId,
                        'icp.wso2.com/created-by': component.createdBy,
                    },
                },
                spec: {
                    type: 'service',
                    lifecycle: 'production',
                    owner: component.createdBy,
                    system: projectName,
                },
            });
        }

        // Discover Environments as Resources
        const environments = await this.icpApiService.getEnvironments();
        for (const environment of environments) {
            entities.push({
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Resource',
                metadata: {
                    name: environment.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    title: environment.name,
                    description: environment.description,
                    annotations: {
                        'icp.wso2.com/environment-id': environment.environmentId,
                        'icp.wso2.com/created-by': environment.createdBy,
                    },
                },
                spec: {
                    type: 'environment',
                    owner: environment.createdBy,
                },
            });
        }

        return entities;
    }
}