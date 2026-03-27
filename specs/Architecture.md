# Architecture Guide

## Connections

```
Browser -> ICP-AUTH/HB:9445
Browser -> ICP-GraphQL:9446
Browser -> ICP-OBS:9448
Ballerina Integrator -> ICP-AUTH/HB:9445
Micro Integrator -> ICP-AUTH/HB:9445
ICP-AUTH/HB -> ICP-AUTH-ADPT:9447
ICP-OBS -> ICP-OBS-ADPT:9449
ICP-GraphQL -> Micro Integrator:9164
ICP-AUTH/HB -> DB:5432
ICP-GraphQL -> DB:5432
ICP-AUTH-ADPT -> DB:5432
ICP-OBS-ADPT -> OpenSearch:9200
```

## Ports & Services

| Port | Service | Source File | Path |
|------|---------|-------------|------|
| 9445 | Auth REST + SPA + Heartbeat | `auth_service.bal`, `runtime_service.bal`, `webserver.bal` | `/auth/*`, `/icp/heartbeat`, `/` |
| 9446 | GraphQL API | `graphql_api.bal` | `/graphql` |
| 9447 | Built-in auth backend | `default_user_service.bal` | — |
| 9448 | Observability | `observability_service.bal` | `/icp/observability/*` |
| 9449 | OpenSearch adapter | `opensearch_adapter_service.bal` | — |
| 9450 | LDAP adapter | `ldap_user_service.bal` | — |
| 5173 | Frontend dev (Vite) | — | `/` |

Init: `main.bal` → `init.bal` (DB, listeners) → `config.bal` (all configurables) → `webserver.bal` (SPA serving, updates `config.json`).
Schedulers: `runtime_offline_scheduler.bal` (600s), `refresh_token_cleanup_scheduler.bal` (86400s).

## Module Layer (`icp_server/modules/`)

- **`storage/`** — Repository pattern. One `*_repository.bal` per entity + `connection_manager.bal`, `database_dialect.bal` (MySQL/PG/MSSQL/H2), `error_mapper.bal`, `repository_common.bal`.
- **`auth/`** — `context_builder.bal` (JWT→identity), `permission_checker.bal` (RBAC v2), `access_resolver.bal` (resource scope), `oidc.bal`.
- **`types/`** — `types.bal` (domain), `auth_types.bal` (RBAC), `mi_management_types.bal`.
- **`utils/`** — `cipher.bal` (encryption), `utils.bal`.
- **`mi_management/`** — HTTP client for MI runtime management APIs (`/management/*`), HMAC-signed JWTs.
- **`observability/`** — `spec.bal` (OpenSearch index schema).

## Database Tables

**Org structure:** `organizations`, `projects`, `components` (BI/MI type), `environments` (production flag).
**Runtime:** `runtimes`, `artifacts`, `artifact_states`, `artifact_tracing`, `artifact_statistics`, `log_levels`, `loggers`.
**RBAC v2:** `users`, `user_groups`, `groups`, `roles_v2`, `permissions`, `group_role_mapping`, `role_permission_mapping`.
**Tokens/Secrets:** `refresh_tokens`, `org_secrets`, `secret_bindings`.
**Credentials DB (separate):** `users`, `user_roles`.
Schema scripts: `icp_server/resources/db/init-scripts/` (per vendor), migrations: `migration-scripts/`.

## Frontend (`frontend/`)

Entry: `src/main.tsx` → `src/App.tsx`. Routes: `src/config/routes.tsx`. Paths: `src/paths.ts`.
Key dirs: `src/pages/` (route components), `src/components/` (shared), `src/api/` (GraphQL + REST clients), `src/hooks/`, `src/contexts/`, `src/config/`, `src/constants/`, `src/utils/`.
API layer: `graphql.ts`, `queries.ts`, `mutations.ts`, `auth.ts`, `authQueries.ts`, `logs.ts`, `metrics.ts`, `miUsers.ts`, `artifactToggleMutations.ts`. Uses `@tanstack/react-query`.
UI: `@wso2/oxygen-ui` (MUI-based), icons from `@wso2/oxygen-ui-icons-react`, charts from `@wso2/oxygen-ui-charts-react`.
Runtime config loaded from `public/config.json` (no rebuild needed). See `frontend/RUNTIME_CONFIG.md`.

## Build

`./gradlew build` → frontend (`pnpm install` + `pnpm build`) → backend (`bal build`) → ZIP distribution.
Backend only: `cd icp_server && bal build`. Frontend only: `cd frontend && pnpm install && pnpm build`.
CI (`.github/workflows/pr-check.yml`): Prettier → Gradle build → H2 init → Docker Compose MySQL tests. Env: Node 22.19.0, JDK 17, Ballerina 2201.13.1.
