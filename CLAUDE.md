# CLAUDE.md

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

## Specs & Documentation

**You must read `specs/Contributing.md` before making any code changes.**
PRs target `main`, squash-merged. CI: Prettier → Gradle build → H2 init → Docker Compose MySQL tests.

| Document | Path |
| -------- | ---- |
| Architecture | `specs/Architecture.md` |
| Features | `specs/Features.md` |
| Deployment | `specs/Deployement.md` |
| Contributing | `specs/Contributing.md` |
| Testing | `specs/Testing.md` |
| GraphQL Schema | `icp_server/schema_graphql.graphql` |
| RBAC v2 Design | `icp_server/rbac_v2_implementation.md` |
| Auth Backend | `icp_server/custom_auth/AUTH_BACKEND_IMPLEMENTATION.md` |
| OIDC/SSO Setup | `icp_server/custom_auth/OIDC_SETUP_GUIDE.md` |
| Frontend House Rules | `frontend/HOUSE_RULES.md` |
| Frontend Runtime Config | `frontend/RUNTIME_CONFIG.md` |
| PR Template | `pull_request_template.md` |
