# Features Reference

## Domain Model

- **Organizations** — multi-tenant container (default `org_id=1` for single-tenant). All projects/environments/secrets scoped to org.
- **Projects** — logical grouping of integrations. Has display name, description, unique handler.
- **Environments** — deployment targets (dev/staging/prod). Production flag affects RBAC. Org-scoped.
- **Components** — deployable integration units (type: BI or MI). Have runtimes in different environments.
- **Runtimes** — MI/BI instances connecting via heartbeat. Track status (RUNNING/OFFLINE), artifacts, node info. JWT auth with kid → org secret.
- **Artifacts (MI)** — REST APIs, Proxy Services, Endpoints, Inbound Endpoints, Sequences, Tasks, Templates, Message Stores/Processors, Connectors, Local Entries, Data Services/Sources, Carbon Apps, Registry Resources.

## API Surface

**GraphQL (port 9446, `/graphql`)** — source: `graphql_api.bal`. Full schema: `icp_server/schema_graphql.graphql`.
Operations by domain: Project CRUD (`projects`, `createProject`, `updateProject`, `deleteProject`, eligibility/handler checks) | Environment CRUD (`environments`, `createEnvironment`, `updateEnvironment`, `deleteEnvironment`, production status) | Component CRUD (`components`, `component`, `createComponent`, `updateComponent`, `deleteComponent`, deployment, artifact types) | Runtime queries (`runtimes`, `runtime`, `services`, `listeners`, `deleteRuntime`) | Artifact ops — per-type listing by env+component (`restApis`, `proxyServices`, `endpoints`, `inboundEndpoints`, `sequences`, `tasks`, `messageStores`, `messageProcessors`, `connectors`, `dataSources`, `services`, `listeners`) + `updateArtifactStatus`, `updateArtifactTracingStatus`, `triggerArtifact` | Logger ops (`loggersByRuntime`, `loggersByEnvironmentAndComponent`, `updateLogLevel`, `updateLoggingProfile`) | Log files (`logFilesByRuntime`, `logFileContent`) | User/access control (user CRUD, groups, roles, permissions, secrets).

**REST Auth (port 9445, `/auth/*`)** — source: `auth_service.bal`. Endpoints: `/auth/capabilities` GET, `/auth/login` POST, `/auth/token/refresh` POST, `/auth/token/introspect` POST, `/auth/change-password` POST, `/auth/reset-password` POST, `/auth/sso/config` GET, `/auth/sso/token` POST.

**Heartbeat (port 9445)** — source: `runtime_service.bal`. `POST /icp/heartbeat` — JWT with kid, payload: runtime ID/type/status/env/project/component/artifacts/node info. Supports lazy binding.

**Observability (port 9448)** — source: `observability_service.bal`. Log search via OpenSearch, registry browsing (MI), metrics.
**OpenSearch Adapter (port 9449)** — source: `opensearch_adapter_service.bal`. Translates queries, JWT auth (internal).

## Authentication & Authorization

**Auth methods:** 1. Built-in (port 9447, `default_user_service.bal`) — JWT/HS256. 2. LDAP (`ldap_user_service.bal`). 3. OIDC/SSO (`modules/auth/oidc.bal`) — Asgardeo, Okta, Auth0, Azure AD, Keycloak; auto-creates users on first login. 4. Custom (`custom_auth/AUTH_BACKEND_IMPLEMENTATION.md`).

**RBAC v2** (design: `icp_server/rbac_v2_implementation.md`): User → Group → Role → Permission.
Scopes: Organization → Project → Environment → Component. Domains: integration mgmt, environment mgmt, project mgmt, observability, user mgmt.
Auth module (`modules/auth/`): `permission_checker.bal` (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`), `context_builder.bal`, `access_resolver.bal`, `oidc.bal`.

## Frontend Pages

Source: `frontend/src/pages/`. Auth: Login, OIDCCallback, ForceChangePassword. Projects: Projects, CreateProject, Project. Environments: Environments, CreateEnvironment, EditEnvironment. Components: Components, CreateComponent, Component, ComponentEditor. Runtimes: OrgRuntimes, Runtime. Observability: RuntimeLogs, ManageLoggers, Metrics, Analytics. RBAC: AccessControl, Create/EditGroup, Create/EditUser, CreateRole, RoleDetail, ComponentGroupDetail, ProjectGroupDetail, ComponentRoleDetail, ProjectRoleDetail, Organizations, Profile. Other: Error, CookiePolicy, PrivacyPolicy.

## Scheduled Tasks

`runtime_offline_scheduler.bal` — marks stale runtimes offline (default 600s). `refresh_token_cleanup_scheduler.bal` — removes expired tokens (default 86400s).

## Secrets

Org secrets in `org_secrets` table, bound via `secret_bindings`. Kid used for runtime JWT validation. Cipher: `modules/utils/cipher.bal`. Config encryption: `$secret{alias}` resolved via `[secrets]` map.
