# Testing Guidelines

## Framework & Conventions

- **Backend:** Ballerina test framework (`ballerina/test`). Files: `*_tests.bal` in `icp_server/tests/`.
- **Test utilities:** `icp_server/tests/test_utils.bal`, `icp_server/tests/mock_oidc_provider.bal`.
- **Frontend:** `__tests__/` dirs next to source; file name: `ComponentName.test.tsx`.

## Test Infrastructure

- **Local:** `bal test` runs against embedded H2.
- **CI:** `docker-compose.test.yml` runs MySQL on port 3307 with test data from `icp_server/resources/db/init-scripts/mysql_test_data_init.sql`.
- **Test config:** `icp_server/tests/Config.toml`.
- **Performance tests:** `icp_server/k6_perf/`.

## Run Commands

```bash
# Backend (local, H2)
cd icp_server && bal test

# Backend (Docker, matches CI)
docker-compose -f icp_server/docker-compose.test.yml up --build

# Frontend
cd frontend && pnpm test
```

## CI Pipeline (`.github/workflows/pr-check.yml`)

Runs on every PR to `main`:
1. Prettier formatting check on frontend
2. Full Gradle build (backend + frontend)
3. H2 database initialization test
4. Docker Compose integration tests against MySQL

Environment: Node.js 22.19.0, JDK 17, Ballerina 2201.13.1.
