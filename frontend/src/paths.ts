/**
 * Single source of truth for app and external URLs. Pure functions and constants only.
 */

export function rootUrl(): string {
  return '/';
}

export function loginUrl(): string {
  return '/login';
}

export function orgHomeUrl(orgHandler: string): string {
  return `/organizations/${orgHandler}/home`;
}

export function orgProjectsUrl(orgHandler: string): string {
  return orgHomeUrl(orgHandler);
}

export function newOrgUrl(): string {
  return '/organizations/new';
}

export function editOrgUrl(orgId: string): string {
  return `/organizations/${orgId}/edit`;
}

export function newProjectUrl(orgHandler: string): string {
  return `/organizations/${orgHandler}/projects/new`;
}

export function projectUrl(orgHandler: string, projectId: string): string {
  return `/organizations/${orgHandler}/projects/${projectId}/home`;
}

export function projectComponentsUrl(orgHandler: string, projectId: string): string {
  return `/organizations/${orgHandler}/projects/${projectId}/home`;
}

export function componentOverviewUrl(orgHandler: string, projectId: string, componentHandler: string): string {
  return `/organizations/${orgHandler}/projects/${projectId}/components/${componentHandler}/overview`;
}

export function newComponentUrl(orgHandler: string, projectId: string): string {
  return `/organizations/${orgHandler}/projects/${projectId}/components/new`;
}

export function editComponentUrl(orgHandler: string, projectId: string, componentId: string): string {
  return `/organizations/${orgHandler}/projects/${projectId}/components/${componentId}/edit`;
}

export function orgAnalyticsUrl(orgHandler: string): string {
  return `/organizations/${orgHandler}/analytics`;
}

export function orgAnalyticsLogsUrl(orgHandler: string): string {
  return `/organizations/${orgHandler}/analytics/logs`;
}

export const external = {
  wso2: 'https://www.wso2.com',
  vite: 'https://vite.dev',
  react: 'https://react.dev',
  oxygenUi: 'https://github.com/wso2/oxygen-ui/tree/next',
} as const;

export const dashboard = '/dashboard';
export const analytics = {
  overview: '/analytics/overview',
  reports: '/analytics/reports',
  realtime: '/analytics/realtime',
  trends: '/analytics/trends',
} as const;
export const users = { list: '/users', roles: '/users/roles', permissions: '/users/permissions' } as const;
export const projects = '/projects';
export const integrations = '/integrations';
export const security = { overview: '/security', apiKeys: '/security/api-keys' } as const;
export const databases = '/databases';
export const domains = '/domains';
export const settings = { base: '/settings', notifications: '/settings/notifications' } as const;
export const help = '/help';
export const docs = {
  tutorials: {
    createProject: '/docs/tutorials/create-project',
    inviteTeam: '/docs/tutorials/invite-team',
    configureSettings: '/docs/tutorials/configure-settings',
  },
  references: {
    concepts: '/docs/references/concepts',
    configuration: '/docs/references/configuration',
  },
} as const;
export const support = {
  helpCenter: '/support/help-center',
  contact: '/support/contact',
} as const;
