import { createDevApp } from '@backstage/dev-utils';
import { icomponentsPlugin, IcomponentsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(icomponentsPlugin)
  .addPage({
    element: <IcomponentsPage />,
    title: 'Root Page',
    path: '/icomponents',
  })
  .render();
