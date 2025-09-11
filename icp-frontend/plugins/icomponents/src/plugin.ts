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

import React from 'react';
import { useLocation } from 'react-router-dom';
import { IComponentFetchComponent } from './IComponentFetchComponent';

export const IcomponentsPage = icomponentsPlugin.provide(
    createRoutableExtension({
        name: 'IcomponentsPage',
        component: async () => {
            return function IcomponentsPageWrapper(props: any) {
                const { search } = useLocation();
                const params = new URLSearchParams(search);
                const projectId = params.get('projectId') || undefined;
                return <IComponentFetchComponent projectId={ projectId } />;
            };
        },
        mountPoint: rootRouteRef,
    }),
);
