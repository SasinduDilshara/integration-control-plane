# Deployment Guide

## Quick Start (Distribution)

To run the pre-built ICP distribution without building from source:

**Prerequisites:**
- Java Runtime Environment (JRE) 21 or higher
- Minimum 1 GB RAM (2 GB recommended), 100 MB disk space
- Modern web browser (Chrome, Firefox, Safari, Edge)

**Steps:**

1. Download and extract the WSO2 Integrator: ICP distribution
2. Start the server:
   ```bash
   # macOS/Linux
   cd <ICP_HOME>/bin && ./icp.sh

   # Windows
   cd <ICP_HOME>\bin && icp.bat
   ```
3. Access the dashboard at `https://localhost:9445/`
4. Login with default credentials: `admin` / `admin`

> **Next steps:** Create an integration project, connect BI/MI runtimes, configure database or SSO — see sections below.

---

## Prerequisites (Building from Source)

| Tool | Version | Purpose |
|------|---------|---------|
| Java | 17+ | Gradle build system |
| Ballerina | 2201.13.1 | Backend compilation and runtime |
| Node.js | 20+ | Frontend build |
| pnpm | 10+ | Frontend package manager |
| Docker & Docker Compose | Latest | Containerized deployment (recommended) |

## Building from Source

### Full Build (Gradle)

```bash
./gradlew build
# or
./build.sh
```

Output: `build/distribution/wso2-integration-control-plane-<version>.zip`

### Backend Only

```bash
cd icp_server
bal build
```

### Frontend Only

```bash
cd frontend
pnpm install
pnpm build
```

Output: `frontend/dist/`

## Running Locally

### Backend with Ballerina

1. Configure database in `icp_server/Config.toml`
2. Start the server:

```bash
cd icp_server
bal run
```

### Frontend Dev Server

1. Configure backend URLs in `frontend/public/config.json`:

```json
{
  "VITE_GRAPHQL_URL": "https://localhost:9446/graphql",
  "VITE_AUTH_BASE_URL": "https://localhost:9445/auth",
  "VITE_OBSERVABILITY_URL": "https://localhost:9448/icp/observability"
}
```

2. Start the dev server:

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend available at: `http://localhost:5173`

### Port Reference

| Port | Service | Path |
|------|---------|------|
| 9445 | Main HTTP (Auth REST API + SPA serving) | `/auth/*`, `/icp/heartbeat`, `/` |
| 9446 | GraphQL API | `/graphql` |
| 9447 | Auth backend service (internal) | — |
| 9448 | Observability service | `/icp/observability/*` |
| 9449 | OpenSearch adapter (internal) | — |
| 5173 | Frontend dev server (Vite) | `/` |

Default credentials: `admin` / `admin`

## Running with Docker Compose

All compose files are in `icp_server/`:

| File | Database | Use Case |
|------|----------|----------|
| `docker-compose.local.yml` | H2 (in-memory) | Quick local dev |
| `docker-compose.mysql.yml` | MySQL | Standard development |
| `docker-compose.postgresql.yml` | PostgreSQL | PostgreSQL development |
| `docker-compose.mssql.yml` | MSSQL | SQL Server development |
| `docker-compose.observability.yml` | MySQL + OpenSearch + Prometheus + Grafana | Full observability stack |
| `docker-compose.test.yml` | MySQL | Automated test execution |

```bash
# Example: MySQL
docker-compose -f icp_server/docker-compose.mysql.yml up --build

# Example: Full observability stack
docker-compose -f icp_server/docker-compose.observability.yml up --build

# Example: Run tests
docker-compose -f icp_server/docker-compose.test.yml up --build
```

## Database Configuration

> **Note:** During development, database settings are in `icp_server/Config.toml`. In the packaged distribution, this file is renamed to `<ICP_HOME>/conf/deployment.toml`. The configuration keys are identical.

> **Production:** The default H2 database is suitable for development and testing only. For production, use MySQL, PostgreSQL, or MSSQL.

### Distribution Setup (MySQL Example)

1. Run the initialization script: `<ICP_HOME>/dbscripts/mysql_init.sql` against your MySQL server
2. Configure `<ICP_HOME>/conf/deployment.toml` with database connection parameters (host, port, name `icp_database`, username, password, type `mysql`)
3. Restart the ICP server

### Development Setup

Configuration file: `icp_server/Config.toml`

### MySQL

```toml
[icp_server.storage]
dbType = "mysql"
host = "localhost"
port = 3306
name = "icp_db"
username = "root"
password = "root"
```

### PostgreSQL

```toml
[icp_server.storage]
dbType = "postgresql"
host = "localhost"
port = 5432
name = "icp_db"
username = "postgres"
password = "postgres"
```

### Microsoft SQL Server

```toml
[icp_server.storage]
dbType = "mssql"
host = "localhost"
port = 1433
name = "icp_db"
username = "SA"
password = "YourStrong@Passw0rd"
```

### H2 (In-Memory)

```toml
[icp_server.storage]
dbType = "h2"
```

### Database Initialization Scripts

Located in `icp_server/resources/db/init-scripts/`:

| Script | Purpose |
|--------|---------|
| `mysql_init.sql` | MySQL main schema |
| `postgresql_init.sql` | PostgreSQL main schema |
| `mssql_init.sql` | MSSQL main schema |
| `h2_init.sql` | H2 main schema |
| `credentials_mysql_init.sql` | MySQL credentials DB |
| `credentials_postgresql_init.sql` | PostgreSQL credentials DB |
| `credentials_mssql_init.sql` | MSSQL credentials DB |
| `credentials_h2_init.sql` | H2 credentials DB |
| `h2_test_data.sql` | H2 test data |
| `mysql_test_data_init.sql` | MySQL test data |

Migration scripts: `icp_server/resources/db/migration-scripts/`

## Authentication Configuration

### Built-in User Backend (Default)

Runs on port 9447. Configured via `icp_server/Config.toml`:

```toml
# JWT for frontend-server communication
frontendJwtHMACSecret = "default-secret-key-at-least-32-characters-long-for-hs256"
frontendJwtIssuer = "icp-frontend-jwt-issuer"
frontendJwtAudience = "icp-server"
defaultTokenExpiryTime = 3600    # 1 hour (seconds)

# Refresh tokens
refreshTokenExpiryTime = 86400   # 1 day (seconds)
enableRefreshTokenRotation = true
maxRefreshTokensPerUser = 10     # 0 = unlimited

# Auth backend URL
authBackendUrl = "https://localhost:9447"
```

### LDAP

See `docs/ldap-user-store.md` for configuration.

### OIDC/SSO

```toml
ssoEnabled = true
ssoIssuer = ""
ssoAuthorizationEndpoint = ""
ssoTokenEndpoint = ""
ssoLogoutEndpoint = ""
ssoClientId = ""
ssoClientSecret = ""
ssoRedirectUri = "https://localhost:3000/auth/callback"
ssoUsernameClaim = "email"  # or "preferred_username"
ssoScopes = ["openid", "email", "profile"]
```

**Supported OIDC Providers:** Asgardeo (WSO2), Okta, Auth0, Azure AD, Keycloak. See `icp_server/custom_auth/OIDC_SETUP_GUIDE.md` for provider-specific endpoint templates.

**SSO User Behavior:**
- First-time SSO login automatically creates a user account in ICP
- Username is extracted from the configured `usernameClaim` (`email` or `preferred_username`)
- Administrators must assign roles and permissions to new SSO users after first login

**SSO Troubleshooting:**
- **SSO not working:** Verify `ssoEnabled = true` and check config file syntax
- **Invalid authorization code:** Verify client ID and client secret; confirm provider is accessible
- **Redirect URI mismatch:** Ensure URI matches exactly in both ICP config and provider settings (case-sensitive, no trailing slashes)
- **Missing claims:** Verify scopes include required claims; confirm `usernameClaim` field exists in provider response
- **Login succeeds but no access:** Verify role assignments in ICP; check permission configuration

**Security Best Practices:**
- Protect client secrets using environment variables
- Require HTTPS in production environments
- Regularly rotate client secrets

### Custom Auth Backend

See `icp_server/custom_auth/AUTH_BACKEND_IMPLEMENTATION.md` for implementing a pluggable auth backend.

### Password Hashing

See `docs/password-hashing-configuration.md` for algorithm configuration.

## TLS/Security Configuration

Keystore and truststore files are in `conf/security/`:

```toml
keystorePath = "../conf/security/wso2carbon.jks"
keystorePassword = "wso2carbon"
truststorePath = "../conf/security/client-truststore.jks"
truststorePassword = "wso2carbon"
```

Passwords can be encrypted using the WSO2 cipher tool. Encrypted values use the format `$secret{alias}` in `Config.toml` and are resolved via the `secrets` map:

```toml
[secrets]
alias = "encrypted-value"
```

### Self-Signed Certificates

For local development with self-signed certs:

```toml
artifactsApiAllowInsecureTLS = true
```

Set to `false` in production with a proper truststore.

## Running the Distribution (Standalone)

After building:

```bash
# Extract
unzip build/distribution/wso2-integration-control-plane-<version>.zip -d build/distribution

# Start
cd build/distribution/wso2-integration-control-plane-<version>/bin
./icp.sh     # Linux/macOS
icp.bat      # Windows
```

Distribution contents:
- `bin/icp-server.jar` — Executable JAR
- `bin/icp.sh`, `bin/icp.bat` — Startup scripts
- `conf/deployment.toml` — Configuration
- `conf/security/` — TLS certificates
- `www/` — Frontend static assets
- `dbscripts/` — Database initialization scripts
- `lib/` — Cipher tool dependencies

## Connecting Integration Runtimes

Connect Ballerina Integration (BI) and Micro Integrator (MI) runtimes to ICP for centralized management and monitoring. The configuration snippet can be extracted from the ICP dashboard via the **"Configure Runtime"** button in your integration project.

### BI Runtime Setup

1. Add the ICP agent configuration to your project's `Config.toml`:

```toml
[anuruddha.wso2.icp]
integration = "my-first-bi-integration"
project = "My ICP Project"
environment = "dev"
heartbeatInterval = 10
```

2. Enable remote management in `Ballerina.toml`:

```toml
remoteManagement = true
```

3. Add the ICP agent import to your main `.bal` file:

```ballerina
import anuruddha/wso2.icp as _;
```

4. Restart the BI runtime. Verify connection by checking console logs for: `ICP agent started successfully`

### MI Runtime Setup

1. Copy the MI configuration snippet from the ICP dashboard
2. Paste the configuration into `<MI_HOME>/conf/deployment.toml`
3. Restart the MI runtime
4. Verify connection by checking console logs for: `Full heartbeat payload` with runtime details

Once connected, both runtimes will appear in the ICP dashboard's **Artifacts** tab showing deployed integration components and system information.

## Kubernetes Deployment

See `kubernetes/SETUP.md` for full guide.

Components:
- `kubernetes/deployment.yaml` — Pod deployment
- `kubernetes/service.yaml` — Service exposure
- `kubernetes/gateway.yaml` — NGINX Gateway Fabric routing
- `kubernetes/route.yaml` — HTTP route definition
- `kubernetes/issuer.yaml` — cert-manager issuer
- `kubernetes/cert.yaml` — TLS certificate
- `kubernetes/backend-tls-policy.yaml` — Backend TLS policy

Requirements: Kubernetes 1.25+, cert-manager, NGINX Gateway Fabric.

## Observability Stack (MI Log Monitoring)

The full observability setup includes:

- **OpenSearch** — Log aggregation and full-text search
- **Fluent Bit** — Log collection and forwarding from MI runtimes
- **Prometheus** — Metrics collection
- **Grafana** — Visualization dashboards

```bash
docker-compose -f icp_server/docker-compose.observability.yml up
```

OpenSearch configuration in `Config.toml` / `deployment.toml`:

```toml
opensearchUrl = "https://localhost:9200"
opensearchUsername = "admin"
opensearchPassword = "Ballerina@123"
observabilityBackendURL = "https://localhost:9449"
```

### MI Log Monitoring Setup

To monitor MI logs in the ICP dashboard using OpenSearch and Fluent Bit:

**Step 1 — MI Log Format Configuration:**

Update the `log4j2.properties` file in your MI installation. Set the CARBON_LOGFILE appender layout pattern to:

```
[%d{yyyy-MM-dd'T'HH:mm:ss.SSSXXX}] %5p {%c} %X{Artifact-Container} - %m%ex
```

This pattern ensures compatibility with ICP's log parsing.

**Step 2 — Fluent Bit & OpenSearch Stack:**

The Docker Compose stack orchestrates four services: `opensearch`, `opensearch-dashboards`, `fluent-bit`, and `opensearch-setup`.

Key Fluent Bit configuration:
- **Input:** File input watching MI log paths with multiline support for stack traces
- **Parsing:** Regex field extraction for timestamp, log level, logger component, and artifact container
- **Enrichment:** Lua script adding runtime ID, product type, and service type
- **Output:** OpenSearch with daily index pattern `mi-application-logs-YYYY-MM-DD`

**Step 3 — Start and Verify:**

```bash
docker compose up --build
docker compose ps          # verify all services running
docker compose logs fluent-bit  # verify log watching
```

**Verification methods:**
- Check Fluent Bit container logs for file watching confirmation
- Query OpenSearch API to verify `mi-application-logs-*` indices exist
- Access OpenSearch Dashboards UI to create index patterns and view logs
- View MI logs directly in the ICP dashboard under project log tabs

## Operational Configuration

```toml
# Runtime health check interval (seconds)
schedulerIntervalSeconds = 600

# Expired refresh token cleanup interval (seconds)
refreshTokenCleanupIntervalSeconds = 86400

# Logging
logLevel = "INFO"           # DEBUG, INFO, WARN, ERROR
enableAuditLogging = true
enableMetrics = true
```
