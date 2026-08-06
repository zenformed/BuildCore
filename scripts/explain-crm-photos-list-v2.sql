-- EXPLAIN templates for Photos list v2 (org-wide image keyset).
-- Replace :org_id / cursor binds from a real first-page last row
-- before next-page EXPLAIN. Do not claim scalability without ANALYZE evidence.

\set org_id '00000000-0000-4000-8000-000000000001'

-- 1) First page (ready images only)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.file_name,
  d.mime_type,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND d.mime_type LIKE 'image/%'
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 41;

-- 2) Next page (forward keyset)
-- Bind :cursor_created_at / :cursor_id from last row of page 1.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.file_name,
  d.mime_type,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND d.mime_type LIKE 'image/%'
  AND (d.created_at, d.id) < (:'cursor_created_at'::timestamptz, :'cursor_id'::uuid)
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 41;

-- 3) Filename-prefix search
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.file_name,
  d.mime_type,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND d.mime_type LIKE 'image/%'
  AND lower(d.file_name) LIKE ('photos-pagination' || '%')
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 41;

-- 4) Member-visible page shape (project scope + assignee filter sketch)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND d.mime_type LIKE 'image/%'
  AND d.project_id = ANY (ARRAY[]::uuid[])
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 41;

-- 5) Full RPC (non-member visibility; no search)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_organization_photos_page_v2(
  :'org_id'::uuid,
  NULL,                 -- p_search_prefix
  41,                   -- p_limit (page size + 1)
  NULL,                 -- p_cursor_created_at
  NULL,                 -- p_cursor_id
  false,                -- p_restrict_member_visibility
  ARRAY[]::uuid[],      -- p_allowed_project_ids
  true,                 -- p_allow_budget
  true,                 -- p_allow_workflow
  true,                 -- p_allow_payments
  true,                 -- p_allow_project_media
  '00000000-0000-4000-8000-000000000099'::uuid, -- p_viewer_user_id
  true,                 -- p_only_assigned_workflow
  true,                 -- p_only_assigned_payments
  ARRAY[]::uuid[]       -- p_member_role_user_ids
);
