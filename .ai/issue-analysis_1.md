# Issue Analysis — [Issue #3]: Orphaned user_groups and group_user_mapping rows after project deletion

## Classification
- **Type:** Bug
- **Severity Assessment:** Medium
- **Affected Component(s):** `icp_server/modules/storage/project_repository.bal` (deleteProject function), database schema
- **Affected Feature(s):** Project deletion (GraphQL `deleteProject` mutation), RBAC v2 group management

## Reproducibility
- **Reproducible:** Yes
- **Environment:** Branch `main` (commit 9f4a9676), MySQL 8.x via `docker-compose.test.yml`, macOS Darwin 24.0.0
- **Steps Executed:**
  1. Started MySQL test database via `docker compose -f icp_server/docker-compose.test.yml up --build`
  2. Inserted a test project into `projects` table
  3. Simulated `createProject` RBAC setup: inserted a project admin group into `user_groups`, a group-role mapping into `group_role_mapping` (scoped to the project), and a group-user mapping into `group_user_mapping`
  4. Verified all three tables had the expected new rows (user_groups: 5, group_user_mapping: 6, group_role_mapping: 7)
  5. Executed `DELETE FROM projects WHERE project_id = 'test-project-orphan-001'` (identical to `storage:deleteProject`)
  6. Queried all three tables after deletion
- **Expected Behavior:** All project-related data should be cleaned up: `user_groups` row (project admin group), `group_user_mapping` rows (members of that group), and `group_role_mapping` rows (role assignments for that group) should all be removed.
- **Actual Behavior:**
  - `group_role_mapping`: row with `project_uuid` referencing the deleted project was cascade-deleted via FK constraint (7 -> 6). **Correctly cleaned up.**
  - `user_groups`: project admin group row persisted (stayed at 5). **Orphaned.**
  - `group_user_mapping`: user-group membership row persisted (stayed at 6). **Orphaned.**
- **Logs/Evidence:**
  ```
  === AFTER CREATE ===
  AFTER CREATE: user_groups      5
  AFTER CREATE: group_user_mapping   6
  AFTER CREATE: group_role_mapping   7

  === AFTER DELETE PROJECT ===
  AFTER DELETE: user_groups      5   <-- should be 4
  AFTER DELETE: group_user_mapping   6   <-- should be 5
  AFTER DELETE: group_role_mapping   6   <-- correctly cascade-deleted

  === ORPHANED DATA ===
  ORPHANED GROUP: test-group-orphan-001  "Orphan Test Project Admins"
  ORPHANED USER-MAP: test-group-orphan-001  770e8400-e29b-41d4-a716-446655440001
  ROLE-MAP (cascade deleted): 0
  ```

## Root Cause Hypothesis

The bug is caused by an incomplete cleanup chain in the project deletion flow:

1. **`createProject`** (`project_repository.bal:87-142`) correctly sets up the full RBAC structure when a project is created:
   - Inserts a row into `user_groups` (project admin group)
   - Inserts a row into `group_role_mapping` (links group to project-scoped role)
   - Inserts a row into `group_user_mapping` (adds creator to the group)

2. **`deleteProject`** (`project_repository.bal:342-355`) only executes:
   ```sql
   DELETE FROM projects WHERE project_id = ?
   ```
   It does NOT delete the associated admin group or its user memberships.

3. **Foreign key cascade behavior:**
   - `group_role_mapping.project_uuid` has `ON DELETE CASCADE` referencing `projects.project_id` -- so role mappings are cleaned up automatically.
   - `user_groups` has **no foreign key** to `projects` -- it only references `organizations.org_id`. There is no cascade path from project deletion to group deletion.
   - `group_user_mapping.group_id` references `user_groups.group_id ON DELETE CASCADE` -- since the group is not deleted, these rows also survive.

4. **The fix** should either:
   - **(Option A — Application-level cleanup):** Before deleting the project, query for groups that have project-scoped role mappings (`group_role_mapping WHERE project_uuid = ?`), then delete those groups (which will cascade-delete `group_user_mapping` and `group_role_mapping` rows). **Caution:** A group may have role mappings to multiple projects -- only delete groups whose ONLY role mappings are to the deleted project.
   - **(Option B — Simpler application-level cleanup):** Delete `group_role_mapping` rows for the project, then delete any `user_groups` that no longer have any `group_role_mapping` entries (orphan cleanup).
   - **(Option C — Track relationship explicitly):** Add a `project_id` column to `user_groups` for project-scoped groups, with `ON DELETE CASCADE` to `projects`.

## Test Coverage Assessment
- **Existing tests covering this path:**
  - `testDeleteProjectNoPermission` (`project_graphql_tests.bal:275`) — Tests that deletion fails without `project_mgt:manage` permission. **Pass** (permission check only, doesn't test actual deletion).
  - `testCreateProjectSuccess` / `testCreateProjectGroupAssignment` (`project_graphql_tests.bal:121-196`) — Tests project creation and verifies the admin group is created. **Pass.**
  - `testDeleteGroup` (`auth_tests_v2.bal:960`) — Tests standalone group deletion via auth API. **Pass** (unrelated to project deletion cascade).
- **Coverage gaps identified:**
  - **No test for successful project deletion** — there is no test that actually deletes a project and verifies the result.
  - **No test for group cleanup after project deletion** — no test verifies that project-scoped groups are removed when the project is deleted.
  - **No test for orphaned data detection** — no test queries `user_groups` or `group_user_mapping` after project deletion to detect orphans.
- **Proposed test plan:**
  - **Unit test:** Test `storage:deleteProject` in isolation — verify that after deletion, no orphaned `user_groups` rows exist for the deleted project's admin group.
  - **Integration test:** Full GraphQL flow — `createProject` (which creates admin group + mappings), then `deleteProject`, then query `user_groups` and `group_user_mapping` to verify cleanup.
  - **Negative/edge cases:**
    - Delete a project whose admin group has been manually assigned additional role mappings to other projects — verify the group is preserved (not deleted) since it still has active mappings.
    - Delete a project where additional (non-admin) groups also have project-scoped role mappings — verify all orphaned groups are cleaned up.
    - Repeated create/delete cycles — verify no accumulation of orphaned rows.
