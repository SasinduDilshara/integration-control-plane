import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  configApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { environmentsApiRef, EnvironmentsApiService } from './api';

export const environmentsPlugin = createPlugin({
  id: 'environments',
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
  ],
});

export const EnvironmentsPage = environmentsPlugin.provide(
  createRoutableExtension({
    name: 'EnvironmentsPage',
    component: () =>
      import('./components/EnvironmentsComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
