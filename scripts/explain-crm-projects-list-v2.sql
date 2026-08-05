-- EXPLAIN templates for Projects/Subprojects list v2 keyset queries (Phase 1+).
-- Replace bind placeholders before running in staging.
-- Do not claim performance wins without ANALYZE evidence.
--
-- Operational ORDER BY:
--   list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
-- Forward keyset after (bucket0, activity0, id0) uses OR-form (not plain row `<`
-- because sort directions are mixed ASC/DESC).

-- 1) Root Projects — first page
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 2) Root Projects — next page (operational keyset, forward)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
  AND (
    list_sort_bucket > $2::smallint
    OR (
      list_sort_bucket = $2::smallint
      AND last_activity_at IS NOT NULL
      AND $3::timestamptz IS NOT NULL
      AND last_activity_at < $3::timestamptz
    )
    OR (
      list_sort_bucket = $2::smallint
      AND last_activity_at IS NOT DISTINCT FROM $3::timestamptz
      AND id < $4::uuid
    )
  )
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 3) Project-scoped Subprojects — first page
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id = $5::uuid
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;

-- 4) Project-scoped Subprojects — next page
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  list_sort_bucket,
  last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id = $5::uuid
  AND (
    list_sort_bucket > $2::smallint
    OR (
      list_sort_bucket = $2::smallint
      AND last_activity_at IS NOT NULL
      AND $3::timestamptz IS NOT NULL
      AND last_activity_at < $3::timestamptz
    )
    OR (
      list_sort_bucket = $2::smallint
      AND last_activity_at IS NOT DISTINCT FROM $3::timestamptz
      AND id < $4::uuid
    )
  )
ORDER BY
  list_sort_bucket ASC,
  last_activity_at DESC NULLS LAST,
  id DESC
LIMIT 51;
