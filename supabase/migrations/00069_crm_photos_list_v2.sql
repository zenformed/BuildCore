-- ============================================================================
-- Phase: Photos list v2 (org-wide image keyset page + SQL visibility + prefix search)
--
-- Additive. Does not alter Documents list v2 RPCs/indexes.
-- Leaves existing project-scoped document indexes in place.
-- ============================================================================

-- Org-wide ready-image keyset (Photos gallery).
create index if not exists idx_crm_documents_org_photos_ready_created_id
  on public.crm_documents (
    organization_id,
    created_at desc,
    id desc
  )
  where deleted_at is null
    and upload_status = 'ready'
    and mime_type like 'image/%';

-- Left-anchored filename search for org-wide photos.
create index if not exists idx_crm_documents_org_photos_filename_prefix
  on public.crm_documents (
    organization_id,
    lower(file_name) text_pattern_ops
  )
  where deleted_at is null
    and upload_status = 'ready'
    and mime_type like 'image/%';

-- Left-anchored project name search (Photos search joins projects).
create index if not exists idx_crm_projects_org_name_prefix
  on public.crm_projects (
    organization_id,
    lower(name) text_pattern_ops
  )
  where archived_at is null;

create or replace function public.crm_list_organization_photos_page_v2(
  p_organization_id uuid,
  p_search_prefix text,
  p_limit int,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_restrict_member_visibility boolean,
  p_allowed_project_ids uuid[],
  p_allow_budget boolean,
  p_allow_workflow boolean,
  p_allow_payments boolean,
  p_allow_project_media boolean,
  p_viewer_user_id uuid,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_member_role_user_ids uuid[]
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
    and d.deleted_at is null
    and d.upload_status = 'ready'
    and d.mime_type like 'image/%'
    and exists (
      select 1
      from public.crm_projects p
      where p.id = d.project_id
        and p.organization_id = p_organization_id
        and p.archived_at is null
        and (
          coalesce(p_restrict_member_visibility, false) = false
          or d.project_id = any (coalesce(p_allowed_project_ids, array[]::uuid[]))
        )
    )
    and (
      (
        d.budget_entry_id is not null
        and coalesce(p_allow_budget, false) = true
      )
      or (
        d.workflow_task_id is not null
        and exists (
          select 1
          from public.crm_workflow_tasks t
          where t.id = d.workflow_task_id
            and t.organization_id = p_organization_id
            and t.project_id = d.project_id
            and t.archived_at is null
            and (
              (
                t.amount_cents is not null
                and coalesce(p_allow_payments, false) = true
                and (
                  coalesce(p_restrict_member_visibility, false) = false
                  or (
                    t.assigned_member_id is not null
                    and t.assigned_contact_id is null
                    and (
                      (
                        coalesce(p_only_assigned_payments, true) = true
                        and t.assigned_member_id = p_viewer_user_id
                      )
                      or (
                        coalesce(p_only_assigned_payments, true) = false
                        and t.assigned_member_id = any (
                          coalesce(p_member_role_user_ids, array[]::uuid[])
                        )
                      )
                    )
                  )
                )
              )
              or (
                t.amount_cents is null
                and coalesce(p_allow_workflow, false) = true
                and (
                  coalesce(p_restrict_member_visibility, false) = false
                  or (
                    t.assigned_member_id is not null
                    and t.assigned_contact_id is null
                    and (
                      (
                        coalesce(p_only_assigned_workflow, true) = true
                        and t.assigned_member_id = p_viewer_user_id
                      )
                      or (
                        coalesce(p_only_assigned_workflow, true) = false
                        and t.assigned_member_id = any (
                          coalesce(p_member_role_user_ids, array[]::uuid[])
                        )
                      )
                    )
                  )
                )
              )
            )
        )
      )
      or (
        d.workflow_task_id is null
        and d.budget_entry_id is null
        and coalesce(p_allow_project_media, false) = true
      )
    )
    and (
      p_search_prefix is null
      or length(p_search_prefix) < 2
      or lower(d.file_name) like (p_search_prefix || '%')
      or exists (
        select 1
        from public.crm_projects p
        where p.id = d.project_id
          and p.organization_id = p_organization_id
          and lower(p.name) like (p_search_prefix || '%')
      )
      or exists (
        select 1
        from public.crm_projects child
        join public.crm_projects parent
          on parent.id = child.parent_project_id
         and parent.organization_id = p_organization_id
        where child.id = d.project_id
          and child.organization_id = p_organization_id
          and lower(parent.name) like (p_search_prefix || '%')
      )
      or exists (
        select 1
        from public.crm_workflow_tasks t
        where t.id = d.workflow_task_id
          and t.organization_id = p_organization_id
          and lower(t.title) like (p_search_prefix || '%')
      )
      or exists (
        select 1
        from public.crm_projects p
        left join public.crm_clients c on c.id = p.client_id
        left join public.crm_contacts ct on ct.id = p.primary_contact_id
        where p.id = d.project_id
          and p.organization_id = p_organization_id
          and (
            lower(coalesce(c.company_name, '')) like (p_search_prefix || '%')
            or lower(coalesce(ct.full_name, '')) like (p_search_prefix || '%')
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

comment on function public.crm_list_organization_photos_page_v2 is
  'BuildCore Photos list v2: org-wide image keyset (created_at DESC, id DESC) with SQL visibility + left-anchored search. No post-fetch overscan.';

revoke all on function public.crm_list_organization_photos_page_v2(
  uuid, text, int, timestamptz, uuid, boolean, uuid[], boolean, boolean, boolean, boolean, uuid, boolean, boolean, uuid[]
) from public;

grant execute on function public.crm_list_organization_photos_page_v2(
  uuid, text, int, timestamptz, uuid, boolean, uuid[], boolean, boolean, boolean, boolean, uuid, boolean, boolean, uuid[]
) to authenticated, service_role;

create or replace function public.crm_organization_photos_has_newer_v2(
  p_organization_id uuid,
  p_after_created_at timestamptz,
  p_after_id uuid,
  p_restrict_member_visibility boolean,
  p_allowed_project_ids uuid[],
  p_allow_budget boolean,
  p_allow_workflow boolean,
  p_allow_payments boolean,
  p_allow_project_media boolean,
  p_viewer_user_id uuid,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_member_role_user_ids uuid[]
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
      and d.deleted_at is null
      and d.upload_status = 'ready'
      and d.mime_type like 'image/%'
      and (d.created_at, d.id) > (p_after_created_at, p_after_id)
      and exists (
        select 1
        from public.crm_projects p
        where p.id = d.project_id
          and p.organization_id = p_organization_id
          and p.archived_at is null
          and (
            coalesce(p_restrict_member_visibility, false) = false
            or d.project_id = any (coalesce(p_allowed_project_ids, array[]::uuid[]))
          )
      )
      and (
        (
          d.budget_entry_id is not null
          and coalesce(p_allow_budget, false) = true
        )
        or (
          d.workflow_task_id is not null
          and exists (
            select 1
            from public.crm_workflow_tasks t
            where t.id = d.workflow_task_id
              and t.organization_id = p_organization_id
              and t.project_id = d.project_id
              and t.archived_at is null
              and (
                (
                  t.amount_cents is not null
                  and coalesce(p_allow_payments, false) = true
                  and (
                    coalesce(p_restrict_member_visibility, false) = false
                    or (
                      t.assigned_member_id is not null
                      and t.assigned_contact_id is null
                      and (
                        (
                          coalesce(p_only_assigned_payments, true) = true
                          and t.assigned_member_id = p_viewer_user_id
                        )
                        or (
                          coalesce(p_only_assigned_payments, true) = false
                          and t.assigned_member_id = any (
                            coalesce(p_member_role_user_ids, array[]::uuid[])
                          )
                        )
                      )
                    )
                  )
                )
                or (
                  t.amount_cents is null
                  and coalesce(p_allow_workflow, false) = true
                  and (
                    coalesce(p_restrict_member_visibility, false) = false
                    or (
                      t.assigned_member_id is not null
                      and t.assigned_contact_id is null
                      and (
                        (
                          coalesce(p_only_assigned_workflow, true) = true
                          and t.assigned_member_id = p_viewer_user_id
                        )
                        or (
                          coalesce(p_only_assigned_workflow, true) = false
                          and t.assigned_member_id = any (
                            coalesce(p_member_role_user_ids, array[]::uuid[])
                          )
                        )
                      )
                    )
                  )
                )
              )
          )
        )
        or (
          d.workflow_task_id is null
          and d.budget_entry_id is null
          and coalesce(p_allow_project_media, false) = true
        )
      )
    limit 1
  ) into found;

  return coalesce(found, false);
end;
$$;

comment on function public.crm_organization_photos_has_newer_v2 is
  'BuildCore Photos list v2: bounded newer-row probe under the same visibility rules as the list page.';

revoke all on function public.crm_organization_photos_has_newer_v2(
  uuid, timestamptz, uuid, boolean, uuid[], boolean, boolean, boolean, boolean, uuid, boolean, boolean, uuid[]
) from public;

grant execute on function public.crm_organization_photos_has_newer_v2(
  uuid, timestamptz, uuid, boolean, uuid[], boolean, boolean, boolean, boolean, uuid, boolean, boolean, uuid[]
) to authenticated, service_role;
