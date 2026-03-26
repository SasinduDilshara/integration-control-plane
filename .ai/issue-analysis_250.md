# Issue Analysis — [Issue #250]: POST `/auth/orgs/{orgHandle}/roles` accepts empty `roleName`

## Classification
- **Type:** Bug
- **Severity Assessment:** Medium
- **Affected Component(s):** `icp_server/auth_service.bal` (Auth REST API, port 9445), `icp_server/modules/storage/auth_repository.bal` (storage layer)
- **Affected Feature(s):** RBAC v2 — Role creation (`POST /auth/orgs/{orgHandle}/roles`) and role update (`PUT /auth/orgs/{orgHandle}/roles/{roleId}`)

## Reproducibility
- **Reproducible:** Yes
- **Environment:** branch `main` (commit 3cc18df2), Ballerina 2201.13.1, macOS Darwin 24.0.0, H2 in-memory database (reproduced 2026-03-26)
- **Steps Executed:**
  1. Built and started the ICP server (`cd icp_server && bal build && bal run`)
  2. Logged in as admin: `POST /auth/login` with `{"username":"admin","password":"admin"}`
  3. Created a role with empty string: `POST /auth/orgs/default/roles` with `{"roleName":"","description":"empty"}`
  4. Created a role with whitespace-only: `POST /auth/orgs/default/roles` with `{"roleName":"   ","description":"spaces"}`
  5. Created a role with missing field (control): `POST /auth/orgs/default/roles` with `{"description":"no roleName"}`
  6. Listed all roles: `GET /auth/orgs/default/roles`
- **Expected Behavior:** Steps 3 and 4 should return `400 Bad Request` with a validation error message. Step 5 should return `400 Bad Request` (it already does).
- **Actual Behavior:**
  - Step 3: `201 Created` — role with empty `roleName` is persisted: `{"roleId":"...", "roleName":"", "orgId":1, "description":"empty"}`
  - Step 4: `201 Created` — role with whitespace-only `roleName` is persisted: `{"roleId":"...", "roleName":"   ", "orgId":1, "description":"spaces"}`
  - Step 5: `400 Bad Request` — correctly rejected (missing required field)
  - Step 6: Both invalid roles appear in the listing alongside legitimate roles (Admin, Developer, etc.)
- **Logs/Evidence:**
  ```
  === Empty roleName → 201 Created ===
  {"roleId":"01f128f7-7fb8-1168-987e-b0b6d84ce04c", "roleName":"", "orgId":1, "description":"empty", ...}

  === Whitespace-only roleName → 201 Created ===
  {"roleId":"01f128f7-7fb8-116e-8177-a633f139d2c2", "roleName":"   ", "orgId":1, "description":"spaces", ...}

  === Missing roleName → 400 Bad Request (correct) ===
  {"message":"data binding failed: required field 'roleName' not present in JSON"}

  === PUT empty roleName → 500 Internal Server Error (should be 400) ===
  {"message":"Failed to update role"}

  === PUT whitespace roleName → 500 Internal Server Error (should be 400) ===
  {"message":"Failed to update role"}
  ```

## Root Cause Hypothesis

The endpoint handler at `auth_service.bal:2415-2483` performs no application-level validation on the `roleName` field before passing it to `storage:createRoleV2()`. The Ballerina `@http:Payload` binding only checks for field presence (non-null), not for empty/whitespace content. The database column `role_name VARCHAR(255) NOT NULL` also only enforces non-null — empty strings and whitespace strings satisfy the NOT NULL constraint.

The same issue exists in the **update** endpoint at `auth_service.bal:2579` (`PUT /auth/orgs/{orgHandle}/roles/{roleId}`), which also calls `storage:updateRoleV2()` without validating `roleName`.

**Fix location:** Validation should be added in `auth_service.bal` at the start of both the `post orgs/[string orgHandle]/roles` handler (line ~2416) and the `put orgs/[string orgHandle]/roles/[string roleId]` handler (line ~2580), before the storage call. The validation should:
1. Trim whitespace from `roleName`
2. Reject the request with `400 Bad Request` if the trimmed value is empty

## Test Coverage Assessment
- **Existing tests covering this path:**
  - `testCreateRole()` in `icp_server/tests/auth_tests_v2.bal:311-340` — PASS (tests valid role creation with a proper name)
  - `testGetRoleById()` — PASS (fetches created role)
  - `testListRoles()` — PASS (lists all roles)
  - `testUpdateRole()` — PASS (updates role name and description)
- **Coverage gaps identified:**
  - No tests for empty `roleName` (should get 400)
  - No tests for whitespace-only `roleName` (should get 400)
  - No tests for very long `roleName` (boundary testing)
  - No tests for special characters / injection in `roleName`
  - No tests for empty/whitespace `roleName` on the update endpoint (`PUT`)
- **Proposed test plan:**
  - Unit test: Validate that `POST /auth/orgs/default/roles` with `{"roleName":""}` returns 400
  - Unit test: Validate that `POST /auth/orgs/default/roles` with `{"roleName":"   "}` returns 400
  - Unit test: Validate that `PUT /auth/orgs/default/roles/{roleId}` with `{"roleName":""}` returns 400
  - Unit test: Validate that `PUT /auth/orgs/default/roles/{roleId}` with `{"roleName":"   "}` returns 400
  - Integration test: Verify that after a rejected empty-name create request, no role with empty name appears in `GET /auth/orgs/default/roles`
  - Negative/edge cases: `roleName` with only tabs/newlines, `roleName` with leading/trailing whitespace but valid content (should be accepted, possibly trimmed)
