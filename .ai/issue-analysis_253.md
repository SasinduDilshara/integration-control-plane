# Issue Analysis — [Issue #253]: Empty Bearer token crashes ICP server — full platform outage

## Classification
- **Type:** Bug
- **Severity Assessment:** Critical (unauthenticated request reportedly crashes the entire server process)
- **Affected Component(s):** `observability_service.bal` (port 9448, `/icp/observability/*`), Ballerina HTTP module declarative JWT auth (`ballerina/http:2.x`)
- **Affected Feature(s):** Observability API — log search endpoint (`POST /icp/observability/logs`); potentially all services using declarative `@http:ServiceConfig { auth: [{ jwtValidatorConfig }] }` annotations

## Reproducibility
- **Reproducible:** No — on current `main` branch with Ballerina 2201.13.1 (Swan Lake Update 13) and HTTP module 2.15.4
- **Environment:**
  - Branch: `main` (commit `48afeb15`)
  - Ballerina: 2201.13.1 (Swan Lake Update 13)
  - HTTP module: `ballerina/http` 2.15.4
  - OS: macOS Darwin 24.0.0
  - Database: H2 (default in-memory)
  - Config: Default `Config.toml` with no external dependencies
- **Steps Executed:**
  1. Built the ICP server with `bal build` (successful).
  2. Started the server with `bal run target/bin/icp_server.jar`.
  3. Verified server was healthy — all 6 services started (ports 9445-9450).
  4. Verified baseline: `POST /icp/observability/logs` without auth returns `401 Unauthorized`.
  5. Sent the exact reproduction command from the issue:
     ```bash
     curl -sk -X POST "https://localhost:9448/icp/observability/logs" \
       -H "Authorization: Bearer " \
       -H "Content-Type: application/json" \
       -d '{"query":"*","from":0,"size":10}'
     ```
  6. Tested additional malformed variants:
     - `Authorization: Bearer ` (trailing space, empty token) — **401, server alive**
     - `Authorization: Bearer` (no space after Bearer) — **401, server alive**
     - `Authorization:Bearer` (no space at all) — **401, server alive**
     - `Authorization: ` (empty value) — **401, server alive**
  7. Tested the GraphQL endpoint (`POST /graphql`) with `Authorization: Bearer ` — **400, server alive**
  8. Confirmed server process remained running after all tests.
- **Expected Behavior (per issue):** Server should return 401 Unauthorized and remain operational.
- **Actual Behavior (observed):**
  - Server returns `401 Unauthorized` with JSON error body for all malformed Bearer variants.
  - Server process remains running — **no crash**.
  - However, server logs show `ERROR` entries with "unhandled error returned from the service" and stack traces from `ballerina.http.2:authenticateResource(auth_desugar.bal)`, indicating the auth errors are caught at the framework level but not cleanly handled.
- **Logs/Evidence:**
  ```
  error:
      at ballerina.http.2:authenticateResource(auth_desugar.bal:45)
         wso2.icp_server.2.$anonType$_91:$post$logs(observability_service.bal:160)
  time=... level=ERROR module=ballerina/http message="unhandled error returned from the service"
    error={"causes":[],"message":"","detail":{},...} path="/icp/observability/logs" method="POST"
  time=... level=ERROR module=ballerina/http message="Invalid authorization header format."
  ```

### Discrepancy Analysis

The issue's stack trace references `extractCredential(auth_utils.bal:51)` producing `{ballerina/lang.array}IndexOutOfRange`, and `observability_service.bal:151`. Our reproduction shows `authenticateResource(auth_desugar.bal:45)` and `observability_service.bal:160`. This suggests:

1. **The `IndexOutOfRange` crash in `extractCredential` has been fixed** in a newer version of the `ballerina/http` module. The HTTP 2.15.4 module (shipped with Ballerina 2201.13.1) now handles the empty-token case gracefully by returning an auth error rather than crashing with an array index out-of-bounds exception.
2. **The line number difference** (151 vs 160) indicates the issue was filed against a slightly different version of the source code.
3. The issue reporter was likely running a build compiled with an older Ballerina distribution or HTTP module version where `extractCredential` did not guard against an empty credential after splitting the `Bearer ` prefix.

## Root Cause Hypothesis

The root cause was a missing bounds check in the Ballerina HTTP module's `extractCredential()` function (`auth_utils.bal`). When the `Authorization` header value is `"Bearer "` (with a trailing space and no token), splitting by space produces an array of size 1 (`["Bearer"]`). Accessing index 1 to get the credential caused an `IndexOutOfRange` panic that propagated as an unhandled error, crashing the server process.

This is a **framework-level bug** in `ballerina/http`, not in the ICP application code. The ICP observability service uses declarative JWT auth (`@http:ServiceConfig { auth: [{ jwtValidatorConfig }] }`), which delegates token extraction entirely to the HTTP module. The ICP code has no opportunity to intercept or guard against this failure.

**Current status:** The bug appears to be **fixed in `ballerina/http` 2.15.4** (Ballerina 2201.13.1). The framework now returns a proper 401 instead of crashing. However, the error is still logged as "unhandled error returned from the service" which could be improved.

**Remaining concern:** While the server no longer crashes, the error handling is not clean — the framework logs ERROR-level stack traces for what should be a routine 401 rejection. This creates log noise in production.

## Test Coverage Assessment
- **Existing tests covering this path:**
  - `token_renew_tests.bal::testRenewTokenWithoutAuthHeader` — tests missing auth header on `/auth/renew-token` (PASS, but different endpoint)
  - `token_renew_tests.bal::testRenewTokenWithInvalidToken` — tests invalid JWT on `/auth/renew-token` (PASS, but different endpoint)
  - `refresh_token_api_tests.bal::testRevokeTokenWithoutAuth` — tests missing auth header on revoke endpoint (PASS, but different endpoint)
  - `refresh_token_api_tests.bal::testRevokeTokenWithInvalidJWT` — tests invalid JWT on revoke endpoint (PASS, but different endpoint)
- **Coverage gaps identified:**
  - **No observability service tests at all** — `observability_service.bal` has zero test coverage
  - **No test sends `Authorization: Bearer ` (empty token)** to any endpoint
  - **No test validates server stability** after receiving malformed auth headers
  - **No test covers the specific `extractCredential` code path** with edge-case Bearer values
  - **GraphQL endpoints** are not tested with missing/malformed auth headers
- **Proposed test plan:**
  - **Unit test:** Test the `extractBearerToken()` function in `runtime_service.bal` with empty, whitespace-only, and malformed Bearer values
  - **Integration test:** Send `Authorization: Bearer ` (empty token) to the observability endpoint (`POST /icp/observability/logs`) and assert: (a) 401 response, (b) server remains responsive to subsequent requests
  - **Negative/edge cases:**
    - `Authorization: Bearer` (no trailing space)
    - `Authorization: ` (empty value)
    - `Authorization: Bearer  ` (multiple trailing spaces)
    - `Authorization: Basic dXNlcjpwYXNz` (wrong scheme)
    - Multiple rapid malformed requests (ensure no resource leak or crash under load)
