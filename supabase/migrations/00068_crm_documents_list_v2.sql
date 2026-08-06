-- ============================================================================
-- Phase: Documents list v2 (project-scoped keyset page + filename prefix search)
--
-- Additive. Extends active-project keyset with id tie-breaker.
-- Leaves idx_crm_documents_active_project in place for now;
-- a later cleanup migration may drop the redundant 3-column index after measured EXPLAIN.
-- ============================================================================

create index if not exists idx_crm_documents_active_project_created_id
  on public.crm_documents (
    organization_id,
    project_id,
    created_at desc,
    id desc
  )
  where deleted_at is null
    and upload_status = 'ready';

-- Left-anchored filename search support (text_pattern_ops).
create index if not exists idx_crm_documents_active_project_filename_prefix
  on public.crm_documents (
    organization_id,
    project_id,
    lower(file_name) text_pattern_ops
  )
  where deleted_at is null
    and upload_status = 'ready';

create or replace function public.crm_list_documents_page_v2(
  p_organization_id uuid,
  p_project_id uuid,
  p_search_prefix text,
  p_limit int,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_restrict_member_visibility boolean,
  p_allowed_workflow_task_ids uuid[],
  p_allow_budget_documents boolean,
  p_allow_project_media boolean
)
returns table (
  id uuid,
  project_id uuid,
  workflow_task_id uuid,
  budget_entry_id uuid,
  document_type text,
  file_name text,
  safe_file_name text,
  mime_type text,
  file_size_bytes bigint,
  upload_status text,
  uploaded_by_member_id uuid,
  reviewed_by_member_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  location_accuracy_meters double precision,
  location_source text,
  location_captured_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if not public.crm_user_has_org_access(p_organization_id) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 51 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.crm_projects p
    where p.id = p_project_id
      and p.organization_id = p_organization_id
      and p.archived_at is null
  ) then
    return;
  end if;

  return query
  select
    d.id,
    d.project_id,
    d.workflow_task_id,
    d.budget_entry_id,
    d.document_type,
    d.file_name,
    d.safe_file_name,
    d.mime_type,
    d.file_size_bytes,
    d.upload_status,
    d.uploaded_by_member_id,
    d.reviewed_by_member_id,
    d.reviewed_at,
    d.created_at,
    d.latitude,
    d.longitude,
    d.location_accuracy_meters,
    d.location_source,
    d.location_captured_at
  from public.crm_documents d
  where d.organization_id = p_organization_id
    and d.project_id = p_project_id
    and d.deleted_at is null
    and d.upload_status = 'ready'
    and (
      p_search_prefix is null
      or length(p_search_prefix) < 2
      or lower(d.file_name) like (p_search_prefix || '%')
    )
    and (
      coalesce(p_restrict_member_visibility, false) = false
      or (
        (d.workflow_task_id is not null
          and d.workflow_task_id = any (coalesce(p_allowed_workflow_task_ids, array[]::uuid[])))
        or (
          coalesce(p_allow_budget_documents, false) = true
          and d.budget_entry_id is not null
        )
        or (
          coalesce(p_allow_project_media, false) = true
          and d.workflow_task_id is null
          and d.budget_entry_id is null
        )
      )
    )
    and (
      p_cursor_id is null
      or (d.created_at, d.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by
    d.created_at desc,
    d.id desc
  limit p_limit;
end;
$$;

comment on function public.crm_list_documents_page_v2 is
  'BuildCore Documents list v2: project-scoped keyset page (created_at DESC, id DESC) with left-anchored filename search. Includes all MIME types (not Photos-filtered).';

revoke all on function public.crm_list_documents_page_v2(
  uuid, uuid, text, int, timestamptz, uuid, boolean, uuid[], boolean, boolean
) from public;

grant execute on function public.crm_list_documents_page_v2(
  uuid, uuid, text, int, timestamptz, uuid, boolean, uuid[], boolean, boolean
) to authenticated, service_role;

create or replace function public.crm_documents_has_newer_v2(
  p_organization_id uuid,
  p_project_id uuid,
  p_after_created_at timestamptz,
  p_after_id uuid,
  p_restrict_member_visibility boolean,
  p_allowed_workflow_task_ids uuid[],
  p_allow_budget_documents boolean,
  p_allow_project_media boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found boolean;
begin
  if auth.uid() is not null then
    if not public.crm_user_has_org_access(p_organization_id) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.crm_documents d
    where d.organization_id = p_organization_id
      and d.project_id = p_project_id
      and d.deleted_at is null
      and d.upload_status = 'ready'
      and (d.created_at, d.id) > (p_after_created_at, p_after_id)
      and (
        coalesce(p_restrict_member_visibility, false) = false
        or (
          (d.workflow_task_id is not null
            and d.workflow_task_id = any (coalesce(p_allowed_workflow_task_ids, array[]::uuid[])))
          or (
            coalesce(p_allow_budget_documents, false) = true
            and d.budget_entry_id is not null
          )
          or (
            coalesce(p_allow_project_media, false) = true
            and d.workflow_task_id is null
            and d.budget_entry_id is null
          )
        )
      )
    limit 1
  ) into found;

  return coalesce(found, false);
end;
$$;

revoke all on function public.crm_documents_has_newer_v2(
  uuid, uuid, timestamptz, uuid, boolean, uuid[], boolean, boolean
) from public;

grant execute on function public.crm_documents_has_newer_v2(
  uuid, uuid, timestamptz, uuid, boolean, uuid[], boolean, boolean
) to authenticated, service_role;
