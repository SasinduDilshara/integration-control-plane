import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  configApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import {
  environmentsApiRef,
  EnvironmentsApiService,
} from './api/EnvironmentsApiService';
import {
  runtimesApiRef,
  RuntimesApiService,
} from './api/RuntimesApiService';

export const environmentOverviewPlugin = createPlugin({
  id: 'environment-overview',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: environmentsApiRef,
      deps: {
        configApi: configApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ configApi, fetchApi }) =>
        new EnvironmentsApiService(configApi, fetchApi),
    }),
    createApiFactory({
      api: runtimesApiRef,
      deps: {
        configApi: configApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ configApi, fetchApi }) =>
        new RuntimesApiService(configApi, fetchApi),
    }),
  ],
});

export const EnvironmentOverviewPage = environmentOverviewPlugin.provide(
  createRoutableExtension({
    name: 'EnvironmentOverviewPage',
    component: () =>
      import('./components/EnvironmentOverview').then(m => m.EnvironmentOverviewComponent),
    mountPoint: rootRouteRef,
  }),
);
