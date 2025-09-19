import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
    InfoCard,
    Progress,
    ResponseErrorPanel,
} from '@backstage/core-components';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Box
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { runtimesApiRef } from '@internal/plugin-runtimes';

/**
 * Info card that shows ICP runtime information for a catalog entity
 */
export const ICPRuntimesCard = () => {
    const { entity } = useEntity();
    const runtimesApi = useApi(runtimesApiRef);

    // Get ICP component ID from entity annotations
    const componentId = entity.metadata.annotations?.['icp.wso2.com/component-id'];

    const { value: runtimes, loading, error } = useAsync(async () => {
        if (!componentId) return [];
        return await runtimesApi.getRuntimes({ componentId });
    }, [componentId]);

    if (!componentId) {
        return (
            <InfoCard title="ICP Runtimes">
                <Typography variant="body2" color="textSecondary">
                    No ICP component ID found in entity annotations
                </Typography>
            </InfoCard>
        );
    }

    if (loading) {
        return (
            <InfoCard title="ICP Runtimes">
                <Progress />
            </InfoCard>
        );
    }

    if (error) {
        return (
            <InfoCard title="ICP Runtimes">
                <ResponseErrorPanel error={error} />
            </InfoCard>
        );
    }

    return (
        <InfoCard title="ICP Runtimes" noPadding>
            <Card>
                <CardContent>
                    {runtimes && runtimes.length > 0 ? (
                        <Box>
                            {runtimes.map((runtime) => (
                                <Box key={runtime.runtimeId} mb={2}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1">
                                            {runtime.runtimeId}
                                        </Typography>
                                        <Chip
                                            label={runtime.status}
                                            color={runtime.status === 'RUNNING' ? 'primary' : 'default'}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" color="textSecondary">
                                        Type: {runtime.runtimeType} | Environment: {runtime.environment.name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Services: {runtime.artifacts?.services?.length || 0} |
                                        Listeners: {runtime.artifacts?.listeners?.length || 0}
                                    </Typography>
                                </Box>
                            ))}
                            <Button
                                variant="outlined"
                                color="primary"
                                href={`/runtimes?componentId=${componentId}`}
                                size="small"
                            >
                                View All Runtimes
                            </Button>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="textSecondary">
                            No runtimes found for this component
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </InfoCard>
    );
};

/**
 * Info card that shows ICP environment information
 */
export const ICPEnvironmentCard = () => {
    const { entity } = useEntity();

    const environmentId = entity.metadata.annotations?.['icp.wso2.com/environment-id'];
    const projectId = entity.metadata.annotations?.['icp.wso2.com/project-id'];

    if (!environmentId && !projectId) {
        return null;
    }

    return (
        <InfoCard title="ICP Environment">
            <Box>
                {environmentId && (
                    <Typography variant="body2">
                        Environment ID: {environmentId}
                    </Typography>
                )}
                {projectId && (
                    <Typography variant="body2">
                        Project ID: {projectId}
                    </Typography>
                )}
                <Box mt={2}>
                    <Button
                        variant="outlined"
                        color="primary"
                        href="/environment-overview"
                        size="small"
                    >
                        View Environment Overview
                    </Button>
                </Box>
            </Box>
        </InfoCard>
    );
};