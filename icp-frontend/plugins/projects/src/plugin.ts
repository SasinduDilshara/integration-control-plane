import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const projectsPlugin = createPlugin({
  id: 'projects',
  routes: {
    root: rootRouteRef,
  },
});

export const ProjectsPage = projectsPlugin.provide(
  createRoutableExtension({
    name: 'ProjectsPage',
    component: () =>
      import('./components/ProjectsComponent').then(m => m.ProjectsComponent),
    mountPoint: rootRouteRef,
  }),
);
