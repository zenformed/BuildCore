-- ============================================================================
-- Phase 0: Projects/Subprojects list v2 keyset foundation
--
-- Adds:
--   1) Immutable SQL function matching TypeScript computeCrmProjectListSortBucket
--   2) STORED generated column list_sort_bucket (cannot go stale)
--   3) Keyset indexes for root Projects and parent-scoped Subprojects
--
-- Additive / reversible. Does not drop existing indexes.
-- ============================================================================

create or replace function public.crm_project_list_sort_bucket(
  p_subproject_status text,
  p_completed_at timestamptz,
  p_priority text
)
returns smallint
language sql
immutable
parallel safe
as $$
  select case
    when p_subproject_status = 'inactive' then 3
    when p_subproject_status = 'completed' or p_completed_at is not null then 2
    when p_subproject_status = 'urgent' or p_priority = 'urgent' then 0
    else 1
  end::smallint;
$$;

comment on function public.crm_project_list_sort_bucket(text, timestamptz, text) is
  'BuildCore list v2 operational sort bucket: urgent=0, normal=1, completed=2, inactive=3. Parity with computeCrmProjectListSortBucket.';

alter table public.crm_projects
  add column if not exists list_sort_bucket smallint
  generated always as (
    public.crm_project_list_sort_bucket(subproject_status, completed_at, priority)
  ) stored;

comment on column public.crm_projects.list_sort_bucket is
  'Generated operational list sort bucket for keyset pagination (urgent/normal/completed/inactive).';

-- Root Projects: dashboard v2 first/next page
-- Supports: org + archived_at IS NULL + parent_project_id IS NULL
--           ORDER BY list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
create index if not exists idx_crm_projects_roots_list_v2
  on public.crm_projects (
    organization_id,
    list_sort_bucket asc,
    last_activity_at desc nulls last,
    id desc
  )
  where archived_at is null
    and parent_project_id is null;

-- Parent-scoped Subprojects: Project page v2 first/next page
-- Supports: org + parent_project_id = $parent + archived_at IS NULL
--           ORDER BY list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
create index if not exists idx_crm_projects_children_list_v2
  on public.crm_projects (
    organization_id,
    parent_project_id,
    list_sort_bucket asc,
    last_activity_at desc nulls last,
    id desc
  )
  where archived_at is null
    and parent_project_id is not null;

-- Activity + id tie-break for activity-only sorts / diagnostics (non-overlapping leading cols vs above)
create index if not exists idx_crm_projects_org_activity_id_v2
  on public.crm_projects (
    organization_id,
    last_activity_at desc nulls last,
    id desc
  )
  where archived_at is null;
