# AGENTS.md

Instructions for all AI coding agents working on this project.

## Product Overview

ICP is the management console for WSO2 integration runtimes — it monitors, manages, and observes MI and BI runtime instances. This is a Ballerina + React monorepo with a GraphQL API backend.

**MI (Micro Integrator)** — Java-based runtime. XML artifacts, `deployment.toml`, log4j logging.
**BI (Ballerina Integrator)** — Ballerina-based runtime. logfmt logging.

Both runtimes POST to `/icp/heartbeat` (full) and `/icp/deltaHeartbeat` (hash-only) with a `kid`-based JWT. On first heartbeat an unbound org-secret key is lazily bound to the project+component+environment. The scheduler (`runtime_offline_scheduler.bal`) marks runtimes offline every 600s if no heartbeat is received.

**Control signal flow differs by runtime type:**
- **BI:** Pending commands (`ControlCommand[]`) are returned inside `HeartbeatResponse.commands`.
- **MI:** Commands are NOT returned in the response. Instead, `sendPendingMIControlCommands()` calls MI's management API (`/management/*`) directly over HTTP with HMAC-signed JWTs. See `modules/mi_management/`.

**Test setup:** BI = `sample-integration`, MI = `mi-sample-integration`; project = `sample-project`, env = `dev`.

## Architecture

See `specs/Architecture.md` for full architecture details including system diagrams, database tables, frontend architecture, and build system.

### Module/Component Map

See `specs/Architecture.md` — includes the full module/component map, service layer, module layer, database tables, frontend architecture, and build system.

## Feature Inventory

See `specs/Features.md` — includes the full domain model, GraphQL queries/mutations, REST endpoints, feature-to-entry-point mapping, and frontend pages.

## Deployment

See `specs/Deployement.md` — includes prerequisites, build commands, running locally, Docker Compose options, database configuration, authentication setup, TLS, Kubernetes deployment, observability stack, health checks, and port reference.

## Testing

See `specs/Testing_guidelines.md` — includes test file listing, test framework details, run commands, CI pipeline, and test infrastructure.

## Coding Conventions

**You must refer to `specs/Contributing_guidelines.md` before making any code changes.** It contains all coding rules, file naming conventions, backend/frontend guidelines, git conventions, and security requirements.

## Contribution Guidelines

See `specs/Contributing_guidelines.md` for full PR process, checklists, database change procedures, and feature addition guides.

### PR Process

- Follow the PR template in `pull_request_template.md`.
- CI (`.github/workflows/pr-check.yml`): Prettier check, Gradle build, H2 init, Docker Compose MySQL tests.
- PRs target `main` and are squash-merged.

## Documentation Paths

| Document | Path |
| -------- | ---- |
| Architecture | `specs/Architecture.md` |
| Features | `specs/Features.md` |
| Deployment | `specs/Deployement.md` |
| Contributing | `specs/Contributing_guidelines.md` |
| Testing | `specs/Testing_guidelines.md` |
| GraphQL Schema | `icp_server/schema_graphql.graphql` |
| Auth Backend OpenAPI | `icp_server/custom_auth/auth-backend-openapi.yaml` |
| RBAC v2 Design | `icp_server/rbac_v2_implementation.md` |
| Custom Auth Backend | `icp_server/custom_auth/AUTH_BACKEND_IMPLEMENTATION.md` |
| OIDC/SSO Setup | `icp_server/custom_auth/OIDC_SETUP_GUIDE.md` |
| Frontend House Rules | `frontend/HOUSE_RULES.md` |
| Frontend Runtime Config | `frontend/RUNTIME_CONFIG.md` |
| PR Template | `pull_request_template.md` |
| REST API Design | <https://wso2.com/whitepapers/wso2-rest-apis-design-guidelines/> |
| Secure Coding | <https://security.docs.wso2.com/en/latest/security-guidelines/secure-engineering-guidelines/secure-coding-guidlines/general-recommendations-for-secure-coding/> |
