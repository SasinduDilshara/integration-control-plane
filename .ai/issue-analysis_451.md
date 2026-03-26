# Issue Analysis — [Issue #451]: [MI] When tracing enabled/disabled it requires page refresh to see the effect

## Classification
- **Type:** Bug
- **Severity Assessment:** Medium
- **Affected Component(s):** `icp_server/graphql_api.bal` (updateArtifactTracingStatus resolver), `frontend/src/components/EntryPoints.tsx` (tracing toggle UI), `frontend/src/api/artifactToggleMutations.ts` (mutation hooks with optimistic updates), `icp_server/modules/storage/heartbeat_repository.bal` (heartbeat processing and intended state sync)
- **Affected Feature(s):** Artifact tracing toggle (MI), GraphQL mutation `updateArtifactTracingStatus`, MI control command flow

## Reproducibility
- **Reproducible:** Yes
- **Environment:** Branch `main`, Ballerina 2201.13.1, Java 21.0.5, Node.js 23.7.0, macOS Darwin 24.0.0, H2 in-memory database
- **Steps Executed:**
  1. Started ICP backend with `bal run` (H2 database) and frontend dev server with `pnpm dev`
  2. Logged in as `admin/admin`, created org secret for `dev` environment
  3. Registered an MI runtime (`mi-runtime-001`) via heartbeat with a `HealthcareAPI` artifact having `tracing: "disabled"`
  4. Verified artifact visible via GraphQL query: `restApisByEnvironmentAndComponent` returned `tracing: "disabled"`
  5. Called `updateArtifactTracingStatus` mutation with `trace: "enable"` for `HealthcareAPI`
  6. Mutation returned `SUCCESS` with message "Artifact tracing change sent to 1 out of 1 runtime(s)"
  7. Immediately re-queried `restApisByEnvironmentAndComponent` — **tracing still showed "disabled"**
  8. Waited 2 seconds and re-queried — **tracing still showed "disabled"**
- **Expected Behavior:** After the mutation succeeds, the UI (and GraphQL queries) should reflect the new tracing state ("enabled") without requiring a manual page refresh.
- **Actual Behavior:** The tracing state remains "disabled" in GraphQL query results until the MI runtime sends a new heartbeat with the updated tracing value. The frontend's optimistic update is immediately overwritten by the `onSettled` refetch which returns stale server data.
- **Logs/Evidence:**
  ```
  === STEP 1: Current tracing state ===
  {"data":{"restApisByEnvironmentAndComponent":[{"name":"HealthcareAPI", "tracing":"disabled"}]}}

  === STEP 2: Enable tracing via mutation ===
  {"data":{"updateArtifactTracingStatus":{"status":"SUCCESS", "message":"Artifact tracing change sent to 1 out of 1 runtime(s)", "successCount":1, "failedCount":0, "details":["Runtime mi-runtime-001: Command queued (runtime offline)"]}}}

  === STEP 3: Immediately re-query tracing state (simulating onSettled refetch) ===
  {"data":{"restApisByEnvironmentAndComponent":[{"name":"HealthcareAPI", "tracing":"disabled"}]}}

  === STEP 4: Wait 2 seconds and re-query (still no heartbeat from MI) ===
  {"data":{"restApisByEnvironmentAndComponent":[{"name":"HealthcareAPI", "tracing":"disabled"}]}}
  ```

## Root Cause Hypothesis

The bug has two interacting causes:

### Backend: Mutation does not update artifact state in the database

The `updateArtifactTracingStatus` resolver (`graphql_api.bal:2427-2563`) performs three actions:
1. Records the **intended state** in `mi_artifact_intended_tracing` table
2. Inserts a **control command** in `mi_runtime_control_commands` table
3. Sends an async HTTP POST to the MI runtime's management API (fire-and-forget)

Critically, **it does NOT update the artifact's `tracing` field in the MI artifact tables** (`mi_rest_apis`, `mi_proxy_services`, etc.). The artifact tracing value in the DB only changes when the MI runtime sends a subsequent heartbeat reporting the new state. This means all GraphQL queries for artifacts return the stale pre-mutation value.

### Frontend: Optimistic update is overwritten by stale refetch

The frontend (`EntryPoints.tsx:155-163`) correctly implements an optimistic update:
1. `setTracingEnabled(pendingToggle.checked)` — immediately shows "enabled" in the UI
2. Calls the mutation

But the `onSettled` callback (`EntryPoints.tsx:162`) calls `queryClient.invalidateQueries()`, which triggers a refetch of the artifact query. The server returns the stale `tracing: "disabled"` value, and the `useEffect` (`EntryPoints.tsx:104-105`) overwrites the optimistic state:
```typescript
useEffect(() => {
  setTracingEnabled(toEnabled(artifact.tracing)); // Overwrites optimistic "enabled" with stale "disabled"
}, [artifactKey, artifact.tracing]);
```

### Two potential fix approaches:
1. **Backend fix**: After recording the intended state, also update the artifact's tracing field in the database immediately (the "source of truth" becomes the intended state, not the heartbeat-reported state). Artifact queries would then reflect the intended state.
2. **Frontend fix**: Use the intended state from the backend response or suppress the refetch for a configurable period (e.g., until the next heartbeat). The `artifactToggleMutations.ts` already has optimistic cache update logic, but it's defeated by the `onSettled` invalidation.
3. **Long-term**: GraphQL subscriptions (tracked in issue #453) would push state changes to the frontend in real-time.

## Test Coverage Assessment
- **Existing tests covering this path:** None. No backend tests for `updateArtifactTracingStatus` mutation. No frontend tests exist at all (no `__tests__`, `test`, or `spec` directories in `frontend/`).
- **Coverage gaps identified:**
  - No test for the `updateArtifactTracingStatus` GraphQL mutation
  - No test for the optimistic update and refetch behavior in the frontend
  - No test for the MI control command flow (intended state → command insertion → async HTTP delivery)
  - No test for the heartbeat-based state synchronization (intended vs actual tracing state)
  - No integration test that verifies the end-to-end flow: mutation → artifact query → heartbeat → artifact query
- **Proposed test plan:**
  - **Unit test (backend):** Test `updateArtifactTracingStatus` mutation — verify it creates intended state record, inserts control commands for RUNNING/OFFLINE runtimes, and returns correct success/failure counts. Verify that after the mutation, querying artifacts returns the intended tracing state (once fix is applied).
  - **Unit test (frontend):** Test the `EntryPointDetail` component — verify that toggling tracing calls the mutation, shows the optimistic state, and does not revert to stale state after refetch.
  - **Integration test:** End-to-end test: register MI runtime via heartbeat with `tracing: "disabled"`, call `updateArtifactTracingStatus` with `trace: "enable"`, verify immediate query returns `tracing: "enabled"` (or intended state), then send heartbeat with `tracing: "enabled"` and verify query still returns `tracing: "enabled"`.
  - **Negative/edge cases:** Test enabling tracing on an already-enabled artifact (no-op), disabling on an already-disabled artifact, toggling on offline runtimes (command should be queued as "pending"), concurrent toggle requests.
