import { createDevApp } from '@backstage/dev-utils';
import { environmentsPlugin, EnvironmentsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(environmentsPlugin)
  .addPage({
    element: <EnvironmentsPage />,
    title: 'Root Page',
    path: '/environments',
  })
  .render();
