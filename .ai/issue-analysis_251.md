# Issue Analysis — [Issue #251]: Creating a project with the same Name as an existing project succeeds but the new project can never be opened

## Classification
- **Type:** Bug
- **Severity Assessment:** High
- **Affected Component(s):** `icp_server/modules/storage/project_repository.bal` (createProject function), database schema (`projects` table in all init scripts)
- **Affected Feature(s):** Project Operations — `createProject` GraphQL mutation, `projectHandlerAvailability` query (advisory only, not enforced)

## Reproducibility
- **Reproducible:** Yes
- **Environment:** Branch `main` (commit 48afeb15), Ballerina 2201.13.1, macOS Darwin 24.0.0, H2 in-memory database
- **Steps Executed:**
  1. Started ICP server with `bal run` (H2 default config)
  2. Logged in as `admin`/`admin` to obtain JWT token
  3. Verified existing project "Sample Project" with handler `sample-project` (ID: `650e8400-...`)
  4. Called `createProject` mutation with `name: "Duplicate Handler Test"`, `projectHandler: "sample-project"` (same handler as existing project)
  5. Listed all projects
  6. Checked `projectHandlerAvailability` for `sample-project`
- **Expected Behavior:** The `createProject` mutation should reject the request with an error indicating that the handler `sample-project` is already taken in the organization
- **Actual Behavior:**
  - The mutation succeeded (200 OK) and returned a new project with ID `01f128f7-...` and handler `sample-project`
  - Both projects appear in the `projects` listing, both with handler `sample-project`
  - The `projectHandlerAvailability` query correctly reports `handlerUnique: false`, but the mutation does not enforce this
  - Navigation by handler (used by the frontend via `getProjectIdByHandler`) returns only the first match, making the duplicate project permanently inaccessible
- **Logs/Evidence:**
  ```
  # createProject mutation response (should have failed):
  {"data":{"createProject":{"id":"01f128f7-4a13-12de-a4af-53f7ce0d4f57","name":"Duplicate Handler Test","handler":"sample-project"}}}

  # Both projects visible in listing:
  [{"id":"01f128f7-...","name":"Duplicate Handler Test","handler":"sample-project"},
   {"id":"650e8400-...","name":"Sample Project","handler":"sample-project"}]

  # Handler availability correctly reports non-unique (advisory only):
  {"data":{"projectHandlerAvailability":{"handlerUnique":false,"alternateHandlerCandidate":"sample-project1"}}}
  ```

## Root Cause Hypothesis

The bug has two contributing causes:

1. **Missing database constraint:** The `projects` table has `UNIQUE (org_id, name)` but does **not** have a `UNIQUE (org_id, handler)` constraint. This is true across all four database schemas (H2, MySQL, PostgreSQL, MSSQL). The handler column only has a non-unique index.

2. **Missing server-side validation:** The `createProject` function in `project_repository.bal` (line 41) validates that `name` and `handler` are non-empty, but does **not** check handler uniqueness before INSERT. The `checkProjectHandlerAvailability` function exists as a separate GraphQL query (used by the frontend for advisory feedback) but is never called during project creation. The frontend may call this query to show a warning, but nothing prevents the mutation from succeeding — the check is purely client-side and advisory.

The fix requires both:
- Adding a `UNIQUE (org_id, handler)` constraint to the `projects` table in all DB init scripts (and a migration script)
- Adding server-side validation in `createProject` to reject duplicate handlers before INSERT (defense in depth, with a clear error message)

## Test Coverage Assessment
- **Existing tests covering this path:**
  - `testCreateProjectSuccess` — tests basic project creation (PASS)
  - `testCreateProjectGroupAssignment` — tests RBAC group setup after creation (PASS)
  - `testCreateProjectNoPermission` — tests permission denial (PASS)
- **Coverage gaps identified:**
  - No test for duplicate handler rejection
  - No test for duplicate name rejection (relies on DB constraint only)
  - No test verifying `projectHandlerAvailability` returns `false` for taken handlers
- **Proposed test plan:**
  - Unit test: Test `createProject` with a duplicate handler returns an error like "A project with this handler already exists in this organization"
  - Unit test: Test `projectHandlerAvailability` returns `handlerUnique: false` for an existing handler
  - Integration test: Create project, attempt duplicate handler creation, verify rejection and that the original project is unaffected
  - Negative/edge cases: Same handler in different orgs should succeed; handler check is case-sensitive
