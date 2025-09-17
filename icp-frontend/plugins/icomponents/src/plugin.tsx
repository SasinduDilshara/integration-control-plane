
import { useLocation } from 'react-router-dom';
import {
    createPlugin,
    createRoutableExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const icomponentsPlugin = createPlugin({
    id: 'icomponents',
    routes: {
        root: rootRouteRef,
    },
});

export const IcomponentsPage = icomponentsPlugin.provide(
    createRoutableExtension({
        name: 'IcomponentsPage',
        component: async () => {
            const { IComponentComponent } = await import('./components/IComponentComponent');
            // Wrapper component to extract projectId from query string
            return function IcomponentsPageWrapper() {
                const { search } = useLocation();
                const params = new URLSearchParams(search);
                const projectId = params.get('projectId') || undefined;
                return <IComponentComponent projectId={projectId} />;
            };
        },
        mountPoint: rootRouteRef,
    }),
);
