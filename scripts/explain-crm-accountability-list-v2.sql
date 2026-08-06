-- EXPLAIN templates for Accountability list v2 (project-scoped keyset).
-- Replace :org_id / :project_id / cursor binds from a real first-page last row
-- before next-page EXPLAIN. Do not claim scalability without ANALYZE evidence.

\set org_id '00000000-0000-4000-8000-000000000001'
\set project_id '00000000-0000-4000-8000-000000000002'

-- 1) First page (index-backed keyset)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  e.id,
  e.event_type,
  e.summary,
  e.created_at,
  e.actor_member_id,
  e.workflow_task_id
FROM public.crm_accountability_events e
WHERE e.organization_id = :'org_id'::uuid
  AND e.project_id = :'project_id'::uuid
ORDER BY
  e.created_at DESC,
  e.id DESC
LIMIT 26;

-- 2) Next page (forward keyset)
-- Bind :cursor_created_at / :cursor_id from last row of page 1.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  e.id,
  e.event_type,
  e.summary,
  e.created_at,
  e.actor_member_id,
  e.workflow_task_id
FROM public.crm_accountability_events e
WHERE e.organization_id = :'org_id'::uuid
  AND e.project_id = :'project_id'::uuid
  AND (e.created_at, e.id) < (:'cursor_created_at'::timestamptz, :'cursor_id'::uuid)
ORDER BY
  e.created_at DESC,
  e.id DESC
LIMIT 26;

-- 3) Searched page (left-anchored summary prefix)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  e.id,
  e.event_type,
  e.summary,
  e.created_at,
  e.actor_member_id,
  e.workflow_task_id
FROM public.crm_accountability_events e
WHERE e.organization_id = :'org_id'::uuid
  AND e.project_id = :'project_id'::uuid
  AND lower(e.summary) LIKE ('updated' || '%')
ORDER BY
  e.created_at DESC,
  e.id DESC
LIMIT 26;

-- 4) Full RPC (same path as BFF)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_accountability_events_page_v2(
  :'org_id'::uuid,
  :'project_id'::uuid,
  NULL, -- p_search_prefix
  26,   -- p_limit (page size + 1)
  NULL, -- p_cursor_created_at
  NULL  -- p_cursor_id
);
