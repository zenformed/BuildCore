-- EXPLAIN templates for Projects list v2 (Phase 1A roots).
-- Org used in Phase 0/1A live checks: 1defbbdb-631c-487f-bcc2-b9cc27af9cf7
-- Replace cursor binds from a real first-page last row before next-page EXPLAIN.
-- Do not claim scalability without ANALYZE evidence.

\set org_id '1defbbdb-631c-487f-bcc2-b9cc27af9cf7'

-- 1) Root Projects — first page (index-backed keyset)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = :'org_id'::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 2) Root Projects — next page (operational keyset, forward)
-- Bind :bucket, :activity, :id from last row of page 1.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = :'org_id'::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
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

-- 3) Filtered page (priority = urgent) — still roots-only
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.id,
  p.list_sort_bucket,
  p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = :'org_id'::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id IS NULL
  AND public.crm_root_matches_list_v2(
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

-- 4) Searched page (identity prefix) — uses idx_crm_record_identity_values_org_type_value
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  p.id,
  p.list_sort_bucket,
  p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = :'org_id'::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id IS NULL
  AND public.crm_root_matches_list_v2(
    p.organization_id,
    p.id,
    'ac',
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

-- 5) Full RPC first page (service_role / authenticated)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_root_projects_page_v2(
  :'org_id'::uuid,
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
