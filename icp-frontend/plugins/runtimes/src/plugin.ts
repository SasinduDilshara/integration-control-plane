import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  configApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { runtimesApiRef, RuntimesApiService } from './api';

export const runtimesPlugin = createPlugin({
  id: 'runtimes',
  routes: {
    root: rootRouteRef,
  },
  apis: [
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

export const RuntimesPage = runtimesPlugin.provide(
  createRoutableExtension({
    name: 'RuntimesPage',
    component: () =>
      import('./components/RuntimesComponent').then(m => m.RuntimesComponent),
    mountPoint: rootRouteRef,
  }),
);
