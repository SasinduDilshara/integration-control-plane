import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const environmentsPlugin = createPlugin({
  id: 'environments',
  routes: {
    root: rootRouteRef,
  },
});

export const EnvironmentsPage = environmentsPlugin.provide(
  createRoutableExtension({
    name: 'EnvironmentsPage',
    component: () =>
      import('./components/EnvironmentsComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
