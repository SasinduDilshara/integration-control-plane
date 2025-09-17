import {
    createPlugin,
    createRoutableExtension,
    createApiFactory,
    configApiRef,
    fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { componentsApiRef, ComponentsApiService } from './api';

export const icomponentsPlugin = createPlugin({
    id: 'icomponents',
    routes: {
        root: rootRouteRef,
    },
    apis: [
        createApiFactory({
            api: componentsApiRef,
            deps: {
                configApi: configApiRef,
                fetchApi: fetchApiRef,
            },
            factory: ({ configApi, fetchApi }) =>
                new ComponentsApiService(configApi, fetchApi),
        }),
    ],
});

export const IcomponentsPage = icomponentsPlugin.provide(
    createRoutableExtension({
        name: 'IcomponentsPage',
        component: () =>
            import('./components/IComponentComponent').then(m => m.IComponentComponent),
        mountPoint: rootRouteRef,
    }),
);
