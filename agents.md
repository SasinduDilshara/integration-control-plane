# AGENTS.md

Instructions for all AI coding agents (Claude, Codex, Gemini, Cursor, Copilot, etc.) working on this project.

## Product Overview

ICP is the management console for WSO2 integration runtimes — it monitors, manages, and observes MI and BI runtime instances. This is a Ballerina + React monorepo with a GraphQL API backend.

**MI (Micro Integrator)** — Java-based runtime. XML artifacts, `deployment.toml`, log4j logging.
**BI (Ballerina Integrator)** — Ballerina-based runtime. logfmt logging.

Both runtimes POST to `/icp/heartbeat` (full) and `/icp/deltaHeartbeat` (hash-only) with a `kid`-based JWT. On first heartbeat an unbound org-secret key is lazily bound to the project+component+environment. The scheduler (`runtime_offline_scheduler.bal`) marks runtimes offline every 600s if no heartbeat is received.

**Control signal flow differs by runtime type:**
- **BI:** Pending commands (`ControlCommand[]`) are returned inside `HeartbeatResponse.commands` — the BI runtime reads them from the heartbeat response and acts on them.
- **MI:** Commands are NOT returned in the response. Instead, `sendPendingMIControlCommands()` calls MI's management API (`/management/*`) directly over HTTP with HMAC-signed JWTs. See `modules/mi_management/` for the full client.

**Test setup:** BI = `sample-integration`, MI = `mi-sample-integration`; project = `sample-project`, env = `dev`.

**Debugging:** Route all traffic through a proxy for wire-dump inspection.

## Specifications and Key Documents

| Document | Path |
|----------|------|
| GraphQL Schema | `icp_server/schema_graphql.graphql` |
| Auth Backend OpenAPI | `icp_server/custom_auth/auth-backend-openapi.yaml` |
| Architecture | `specs/Architecture.md` |
| Features | `specs/Features.md` |
| Deployment | `specs/Deployement.md` |
| Contributing | `specs/Contributing_guidelines.md` |
| RBAC v2 Design | `icp_server/rbac_v2_implementation.md` |
| Custom Auth Backend | `icp_server/custom_auth/AUTH_BACKEND_IMPLEMENTATION.md` |
| OIDC/SSO Setup | `icp_server/custom_auth/OIDC_SETUP_GUIDE.md` |
| Frontend House Rules | `frontend/HOUSE_RULES.md` |
| Frontend Runtime Config | `frontend/RUNTIME_CONFIG.md` |
| PR Template | `pull_request_template.md` |

## General Rules

### Do NOT

- Add comments, docstrings, or type annotations to code you did not change.
- Refactor, "improve", or clean up surrounding code when fixing a bug or adding a feature.
- Add error handling for scenarios that cannot happen.
- Create new files unless absolutely necessary. Prefer editing existing files.
- Add new dependencies without explicit approval.
- Modify CI/CD pipelines, GitHub Actions, or Gradle build files without explicit approval.
- Over-engineer. No premature abstractions, no feature flags, no backwards-compatibility shims.
- Add `// removed`, `// deprecated`, or placeholder comments for deleted code. Just delete it.
- Rename unused variables to `_` prefixed names. If unused, remove entirely — unless required by an interface or framework signature.
- Create fallback tests with mock/hardcoded data when original tests fail. Fix the actual failing tests instead.

### Do

- Keep changes minimal and focused on the task requested.
- Follow existing patterns in the codebase. Match the style of surrounding code.
- Promote code reusability and define constants where applicable.
- Read relevant spec documents before making changes to a feature area.

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Ballerina source files | `snake_case.bal` | `runtime_service.bal` |
| Pure TypeScript (`.ts`) | `camelCase.ts` | `useCreateProject.ts` |
| React components (`.tsx`) | `PascalCase.tsx` | `ProjectList.tsx` |
| SQL scripts | `snake_case.sql` | `mysql_init.sql` |

## Coding Guidelines

### Backend (Ballerina)

- **Storage pattern:** Each entity gets its own `*_repository.bal` in `icp_server/modules/storage/`. Repository functions take SQL client as param.
- **Auth:** All GraphQL resolvers and REST endpoints must check RBAC v2 permissions via `icp_server/modules/auth/permission_checker.bal`. Never skip authorization.
- **Types:** Domain types live in `icp_server/modules/types/`. Use existing types; do not duplicate definitions.
- **Config:** All configurable values go through `icp_server/config.bal`. Do not hardcode environment-specific values.
- **MI vs BI differences:** MI management uses direct HTTP calls via `icp_server/modules/mi_management/`. BI control is via heartbeat response in `icp_server/runtime_service.bal`. Understand which runtime you are targeting before making changes.
- **DB support:** Schema changes must include scripts for all four databases: MySQL, PostgreSQL, MSSQL, H2. See `icp_server/resources/db/init-scripts/` and `migration-scripts/`. Credential tables are in separate `credentials_*_init.sql` files.
- **DB dialect:** All raw SQL must use the dialect abstraction in `modules/storage/database_dialect.bal` (boolean literals, LIMIT clauses, timestamp functions differ across databases). Never write DB-specific SQL inline.
- **Error handling:** Repository functions return `error` unions. Use `classifySqlError()` from `modules/storage/error_mapper.bal` to classify DB errors. Never expose raw SQL errors in API responses.
- **Tests:** Backend tests in `icp_server/tests/`. `bal test` runs against H2 locally; CI uses MySQL via `docker-compose.test.yml`.

### Frontend (React/TypeScript)

- **UI library:** Use `@wso2/oxygen-ui` components. Do not introduce other UI component libraries.
- **Routing:** All URL paths are defined in `frontend/src/paths.ts` — single source of truth.
- **API layer:** GraphQL queries/mutations go in `frontend/src/api/`. Use TanStack React Query hooks consistent with existing patterns.
- **Pages:** One page component per route in `frontend/src/pages/`.
- **House rules:** Read `frontend/HOUSE_RULES.md` before making frontend changes.
- **Tests:** Place tests in `__tests__/` directories next to source files. File name: `ComponentName.test.tsx`.

### Git Conventions

- Use short imperative sentences without conventional commit prefixes (no `feat:`, `fix:`, etc.).
- Examples: "Add log search support for BI runtimes", "Fix heartbeat delta hash comparison"
- PRs are squash-merged, so the final commit history stays clean automatically.
- Follow the PR template in `pull_request_template.md`.

### Security

- Never log PII or sensitive runtime data (secrets, tokens, credentials).
- Do not expose internal error details in API responses for 5xx errors.

## Additional References

- REST API design: https://wso2.com/whitepapers/wso2-rest-apis-design-guidelines/
- Secure coding: https://security.docs.wso2.com/en/latest/security-guidelines/secure-engineering-guidelines/secure-coding-guidlines/general-recommendations-for-secure-coding/
