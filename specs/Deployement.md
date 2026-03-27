# Deployment Guide

## Prerequisites

Java 17+, Ballerina 2201.13.1, Node.js 20+, pnpm 10+, Docker & Docker Compose (latest).

## Build

Full: `./gradlew build` → output: `build/distribution/wso2-integration-control-plane-<version>.zip`.
Backend only: `cd icp_server && bal build`. Frontend only: `cd frontend && pnpm install && pnpm build`.

## Run Locally

**Backend:** configure DB in `icp_server/Config.toml`, then `cd icp_server && bal run`.
**Frontend:** set URLs in `frontend/public/config.json` (`VITE_GRAPHQL_URL`, `VITE_AUTH_BASE_URL`, `VITE_OBSERVABILITY_URL`), then `cd frontend && pnpm install && pnpm dev`.
Default login: `admin` / `admin`.

## Ports

9445: Auth REST + SPA + Heartbeat (`/auth/*`, `/icp/heartbeat`, `/`). 9446: GraphQL (`/graphql`). 9447: Auth backend (internal). 9448: Observability (`/icp/observability/*`). 9449: OpenSearch adapter (internal). 5173: Frontend dev (Vite).

## Docker Compose (`icp_server/`)

`docker-compose.local.yml` (H2, quick dev), `docker-compose.mysql.yml` (MySQL), `docker-compose.postgresql.yml` (PG), `docker-compose.mssql.yml` (MSSQL), `docker-compose.observability.yml` (MySQL+OpenSearch+Prometheus+Grafana), `docker-compose.test.yml` (MySQL, CI tests).
Usage: `docker-compose -f icp_server/<file> up --build`.

## Database

Config: `icp_server/Config.toml` (distribution: `<ICP_HOME>/conf/deployment.toml` — same keys). Set `[icp_server.storage]`: `dbType` (`mysql`/`postgresql`/`mssql`/`h2`), `host`, `port`, `name`, `username`, `password`.
Init scripts: `icp_server/resources/db/init-scripts/` (per vendor + credentials). Migrations: `migration-scripts/`. H2 is dev-only.

## Authentication

**Built-in (default, port 9447):** JWT config in `Config.toml` — `frontendJwtHMACSecret`, token expiry, refresh tokens.
**LDAP:** `docs/ldap-user-store.md`. **Custom:** `icp_server/custom_auth/AUTH_BACKEND_IMPLEMENTATION.md`.
**OIDC/SSO:** `ssoEnabled=true` + provider endpoints in `Config.toml`. Providers: Asgardeo, Okta, Auth0, Azure AD, Keycloak. Guide: `icp_server/custom_auth/OIDC_SETUP_GUIDE.md`.

## TLS, Secrets & Distribution

Keystores: `conf/security/`. Encrypted values: `$secret{alias}` in Config.toml resolved via `[secrets]` map. Dev: `artifactsApiAllowInsecureTLS = true`.
Distribution: extract ZIP, run `bin/icp.sh` (or `icp.bat`), config at `conf/deployment.toml`, access `https://localhost:9445/`.

## Connecting Runtimes

**BI:** Add `[anuruddha.wso2.icp]` to `Config.toml`, set `remoteManagement=true` in `Ballerina.toml`, import `anuruddha/wso2.icp as _`.
**MI:** Copy config from ICP dashboard → `<MI_HOME>/conf/deployment.toml` → restart.

## Wire-dump

Debugging proxy and db dump writes all traffic to
`docker/mounts/wire-dump/requests/`: `{timestamp}_{source}_{METHOD}_{path}_{status}.txt` or `{timestamp}_db-cdc_{OP}_{table}_{key}.txt`.
Delete these as needed.

## UI

`https://localhost:9460` admin:admin
Three levels: organizations → projects → components.
Same feature may exist in multiple levels.
User group to role mapping is level specific.
