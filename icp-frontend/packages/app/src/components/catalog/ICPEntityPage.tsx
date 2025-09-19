import React from 'react';
import { EntityLayout } from '@backstage/plugin-catalog';
import { Grid } from '@material-ui/core';

// Import your existing components
import { ProjectsPage } from '@internal/plugin-projects';
import { EnvironmentsPage } from '@internal/plugin-environments';
import { RuntimesPage } from '@internal/plugin-runtimes';
import { EnvironmentOverviewPage } from '@internal/plugin-environment-overview';

export const icpEntityPage = (
    <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    {/* Standard entity overview content */}
                </Grid>
            </Grid>
        </EntityLayout.Route>

        <EntityLayout.Route path="/icp-components" title="ICP Components">
            <ProjectsPage />
        </EntityLayout.Route>

        <EntityLayout.Route path="/environments" title="Environments">
            <EnvironmentsPage />
        </EntityLayout.Route>

        <EntityLayout.Route path="/runtimes" title="Runtimes">
            <RuntimesPage />
        </EntityLayout.Route>

        <EntityLayout.Route path="/environment-overview" title="Environment Overview">
            <EnvironmentOverviewPage />
        </EntityLayout.Route>
    </EntityLayout>
);