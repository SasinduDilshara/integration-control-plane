# Testing Guidelines

## Framework & Conventions

- **Backend framework:** Ballerina built-in test framework (`ballerina/test`)
- **Backend naming:** `*_tests.bal`
- **Backend test location:** `icp_server/tests/`
- **Backend test utilities:** `icp_server/tests/test_utils.bal`, `icp_server/tests/mock_oidc_provider.bal`
- **Frontend test location:** `__tests__/` directories next to source files; file name: `ComponentName.test.tsx`

## Test Infrastructure

- **Local:** `bal test` runs against embedded H2 database
- **CI:** `docker-compose.test.yml` runs MySQL on port 3307 with test data from `icp_server/resources/db/init-scripts/mysql_test_data_init.sql`
- **Test config:** `icp_server/tests/Config.toml`
- **Performance tests:** `icp_server/k6_perf/`

## Backend Tests

Location: `icp_server/tests/`

Test files:
- `auth_tests_v2.bal` — RBAC v2 authorization tests
- `oidc_tests.bal` — OIDC flow tests
- `component_graphql_tests.bal` — Component management tests
- `environment_graphql_tests.bal` — Environment management tests
- `project_graphql_tests.bal` — Project management tests
- `runtime_graphql_tests.bal` — Runtime management tests
- `refresh_token_api_tests.bal` — Refresh token API tests
- `refresh_token_storage_tests.bal` — Token storage tests
- `refresh_token_utils_tests.bal` — Token utility tests
- `token_renew_tests.bal` — Token renewal tests
- `test_utils.bal` — Test utilities and helpers
- `mock_oidc_provider.bal` — Mock OIDC provider for testing

```bash
# Run locally
cd icp_server && bal test

# Run with Docker (matches CI)
docker-compose -f icp_server/docker-compose.test.yml up --build
```

## Frontend Tests

```bash
cd frontend
pnpm test
```

## CI Pipeline (`.github/workflows/pr-check.yml`)

The CI runs on every PR to `main`:
1. Prettier formatting check on frontend code
2. Full Gradle build (backend + frontend)
3. H2 database initialization test
4. Docker Compose integration tests against MySQL

**Environment:** Node.js 22.19.0, JDK 17, Ballerina 2201.13.1
