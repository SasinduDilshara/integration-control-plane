import { type RouteProps, Navigate } from 'react-router';
import { rootUrl, loginUrl, orgHomeUrl, projectUrl, componentOverviewUrl } from '../paths';
import PublicLayout from '../layouts/PublicLayout';
import Login from '../pages/Login';
import AppLayout from '../layouts/AppLayout';
import Projects from '../pages/Projects';
import Project from '../pages/Project';
import Component from '../pages/Component';

export interface AppRoute extends Omit<RouteProps, 'children'> {
  children?: AppRoute[];
}

const routes: AppRoute[] = [
  { path: rootUrl(), element: <Navigate to={loginUrl()} replace /> },
  {
    element: <PublicLayout />,
    children: [{ path: loginUrl(), element: <Login /> }],
  },
  {
    element: <AppLayout />,
    children: [
      { path: orgHomeUrl(':orgHandler'), element: <Projects /> },
      { path: projectUrl(':orgHandler', ':projectId'), element: <Project /> },
      { path: componentOverviewUrl(':orgHandler', ':projectId', ':componentHandler'), element: <Component /> },
    ],
  },
];

export default routes;
