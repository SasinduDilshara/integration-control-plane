import { createDevApp } from '@backstage/dev-utils';
import { projectsPlugin, ProjectsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(projectsPlugin)
  .addPage({
    element: <ProjectsPage />,
    title: 'Root Page',
    path: '/projects',
  })
  .render();
