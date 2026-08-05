-- EXPLAIN templates for Projects list v2 Phase 2A (parent-scoped Subprojects).
-- Org used in live checks: 1defbbdb-631c-487f-bcc2-b9cc27af9cf7
-- Bind :parent_id to a real root Project id in that org before running.
-- Replace cursor binds from a real first-page last row before next-page EXPLAIN.
-- Do not claim scalability without ANALYZE evidence.

\set org_id '1defbbdb-631c-487f-bcc2-b9cc27af9cf7'
-- \set parent_id 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

-- 1) Child Subprojects — first page (index-backed keyset under parent)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = :'org_id'::uuid
  AND archived_at IS NULL
  AND parent_project_id = :'parent_id'::uuid
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 2) Child Subprojects — next page (operational keyset, forward)
-- Bind :bucket, :activity, :id from last row of page 1.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = :'org_id'::uuid
  AND archived_at IS NULL
  AND parent_project_id = :'parent_id'::uuid
  AND public.crm_list_v2_after_cursor(
    list_sort_bucket,
    last_activity_at,
    id,
    :bucket::smallint,
    :activity::timestamptz,
    :id::uuid
  )
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 3) Filtered child page (priority = urgent)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.id,
  p.list_sort_bucket,
  p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = :'org_id'::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id = :'parent_id'::uuid
  AND public.crm_project_matches_list_v2_filters(
    p.organization_id,
    p.id,
    null,
    null,
    null,
    null,
    array['urgent']::text[],
    null
  )
ORDER BY
  p.list_sort_bucket ASC,
  p.last_activity_at DESC NULLS LAST,
  p.id DESC
LIMIT 51;

-- 4) Searched child page (prefix match; min length 2)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.id,
  p.list_sort_bucket,
  p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = :'org_id'::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id = :'parent_id'::uuid
  AND public.crm_project_matches_list_v2_filters(
    p.organization_id,
    p.id,
    'pa',
    null,
    null,
    null,
    null,
    null
  )
ORDER BY
  p.list_sort_bucket ASC,
  p.last_activity_at DESC NULLS LAST,
  p.id DESC
LIMIT 51;

-- 5) Full child page RPC (first page)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_child_projects_page_v2(
  :'org_id'::uuid,
  :'parent_id'::uuid,
  '00000000-0000-4000-8000-000000000000'::uuid,
  false,
  false,
  false,
  false,
  array[]::uuid[],
  null,
  null,
  null,
  null,
  null,
  null,
  51,
  'forward',
  null,
  null,
  null
);

-- 6) Full child count RPC
EXPLAIN (ANALYZE, BUFFERS)
SELECT public.crm_count_child_projects_v2(
  :'org_id'::uuid,
  :'parent_id'::uuid,
  '00000000-0000-4000-8000-000000000000'::uuid,
  false,
  false,
  false,
  false,
  array[]::uuid[],
  null,
  null,
  null,
  null,
  null,
  null
);
