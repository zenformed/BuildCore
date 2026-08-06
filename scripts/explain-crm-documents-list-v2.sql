-- EXPLAIN templates for Documents list v2 (project-scoped keyset).
-- Replace :org_id / :project_id / cursor binds from a real first-page last row
-- before next-page EXPLAIN. Do not claim scalability without ANALYZE evidence.

\set org_id '00000000-0000-4000-8000-000000000001'
\set project_id '00000000-0000-4000-8000-000000000002'

-- 1) First page (ready, not deleted; includes all MIME types)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.file_name,
  d.mime_type,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.project_id = :'project_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 26;

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
  AND d.project_id = :'project_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND (d.created_at, d.id) < (:'cursor_created_at'::timestamptz, :'cursor_id'::uuid)
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 26;

-- 3) Filename-prefix search
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  d.id,
  d.file_name,
  d.mime_type,
  d.created_at
FROM public.crm_documents d
WHERE d.organization_id = :'org_id'::uuid
  AND d.project_id = :'project_id'::uuid
  AND d.deleted_at IS NULL
  AND d.upload_status = 'ready'
  AND lower(d.file_name) LIKE ('invoice' || '%')
ORDER BY
  d.created_at DESC,
  d.id DESC
LIMIT 26;

-- 4) Full RPC (same path as BFF; non-member visibility)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_documents_page_v2(
  :'org_id'::uuid,
  :'project_id'::uuid,
  NULL,   -- p_search_prefix
  26,     -- p_limit (page size + 1)
  NULL,   -- p_cursor_created_at
  NULL,   -- p_cursor_id
  false,  -- p_restrict_member_visibility
  ARRAY[]::uuid[],
  true,   -- p_allow_budget_documents
  true    -- p_allow_project_media
);
