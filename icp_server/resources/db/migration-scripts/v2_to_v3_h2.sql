-- ICP v2 -> v3: Add unique constraint on project handler per organization
--
-- This migration ensures that no two projects within the same organization
-- can share the same handler (URL slug). Duplicate handlers caused "ghost"
-- projects that appeared in listings but could never be opened.
--
-- IMPORTANT: Before running this script, review which duplicates will be
-- removed by running:
--   SELECT p.project_id, p.org_id, p.name, p.handler, p.created_date
--   FROM projects p
--   WHERE EXISTS (
--       SELECT 1 FROM projects p2
--       WHERE p2.org_id = p.org_id AND p2.handler = p.handler
--       AND p2.project_id < p.project_id
--   );

-- Step 1: Remove duplicate handlers (keep the earliest-created project)
DELETE FROM projects WHERE project_id IN (
    SELECT p.project_id FROM projects p
    WHERE EXISTS (
        SELECT 1 FROM projects p2
        WHERE p2.org_id = p.org_id AND p2.handler = p.handler
        AND p2.project_id < p.project_id
    )
);

-- Step 2: Drop old non-unique handler index
DROP INDEX IF EXISTS idx_projects_handler;

-- Step 3: Add unique constraint on (org_id, handler)
ALTER TABLE projects ADD CONSTRAINT uk_project_handler_org UNIQUE (org_id, handler);
