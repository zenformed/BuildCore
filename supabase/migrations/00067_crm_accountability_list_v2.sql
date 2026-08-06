-- ============================================================================
-- Phase: Accountability list v2 (project-scoped keyset page + search)
--
-- Additive. Extends keyset index with id tie-breaker.
-- Leaves idx_crm_accountability_events_project_created in place for now;
-- a later cleanup migration may drop the redundant 3-column index.
-- ============================================================================

create index if not exists idx_crm_accountability_events_project_created_id
  on public.crm_accountability_events (
    organization_id,
    project_id,
    created_at desc,
    id desc
  );

-- Left-anchored summary search support (text_pattern_ops).
create index if not exists idx_crm_accountability_events_project_summary_prefix
  on public.crm_accountability_events (
    organization_id,
    project_id,
    lower(summary) text_pattern_ops
  );

create or replace function public.crm_list_accountability_events_page_v2(
  p_organization_id uuid,
  p_project_id uuid,
  p_search_prefix text,
  p_limit int,
  p_cursor_created_at timestamptz,
  p_cursor_id uuid
)
returns table (
  id uuid,
  event_type text,
  summary text,
  created_at timestamptz,
  actor_member_id uuid,
  workflow_task_id uuid
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

  -- Project must belong to this organization and be active.
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
    e.id,
    e.event_type,
    e.summary,
    e.created_at,
    e.actor_member_id,
    e.workflow_task_id
  from public.crm_accountability_events e
  where e.organization_id = p_organization_id
    and e.project_id = p_project_id
    and (
      p_search_prefix is null
      or length(p_search_prefix) < 2
      or lower(e.summary) like (p_search_prefix || '%')
      or exists (
        select 1
        from public.profiles pr
        where pr.id = e.actor_member_id
          and (
            lower(trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')))
              like (p_search_prefix || '%')
            or lower(coalesce(pr.last_name, '')) like (p_search_prefix || '%')
            or lower(coalesce(pr.first_name, '')) like (p_search_prefix || '%')
          )
      )
      or exists (
        select 1
        from public.crm_workflow_tasks t
        where t.id = e.workflow_task_id
          and lower(t.stage_slug) like (p_search_prefix || '%')
      )
    )
    and (
      p_cursor_id is null
      or (e.created_at, e.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by
    e.created_at desc,
    e.id desc
  limit p_limit;
end;
$$;

comment on function public.crm_list_accountability_events_page_v2 is
  'BuildCore Accountability list v2: project-scoped keyset page (created_at DESC, id DESC) with left-anchored search.';

revoke all on function public.crm_list_accountability_events_page_v2(
  uuid, uuid, text, int, timestamptz, uuid
) from public;

grant execute on function public.crm_list_accountability_events_page_v2(
  uuid, uuid, text, int, timestamptz, uuid
) to authenticated, service_role;

-- Lightweight newer-activity probe (bounded).
create or replace function public.crm_accountability_has_newer_v2(
  p_organization_id uuid,
  p_project_id uuid,
  p_after_created_at timestamptz,
  p_after_id uuid
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
    from public.crm_accountability_events e
    where e.organization_id = p_organization_id
      and e.project_id = p_project_id
      and (e.created_at, e.id) > (p_after_created_at, p_after_id)
    limit 1
  ) into found;

  return coalesce(found, false);
end;
$$;

revoke all on function public.crm_accountability_has_newer_v2(
  uuid, uuid, timestamptz, uuid
) from public;

grant execute on function public.crm_accountability_has_newer_v2(
  uuid, uuid, timestamptz, uuid
) to authenticated, service_role;
