-- ============================================================================
-- Phase 2A: Project-scoped Subprojects list v2 RPC (keyset + search + filters + visibility)
--
-- Additive. Reuses 00064 list_sort_bucket / children index and 00065 match/keyset helpers.
-- Does not alter roots RPCs or dashboard behavior.
-- ============================================================================

-- Keyset page of direct children for one parent Project.
create or replace function public.crm_list_child_projects_page_v2(
  p_organization_id uuid,
  p_parent_project_id uuid,
  p_viewer_user_id uuid,
  p_restrict_member_visibility boolean,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_include_payments boolean,
  p_member_role_user_ids uuid[],
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[],
  p_limit int,
  p_direction text, -- 'forward' | 'backward'
  p_cursor_bucket smallint,
  p_cursor_activity timestamptz,
  p_cursor_id uuid
)
returns table (
  id uuid,
  list_sort_bucket smallint,
  last_activity_at timestamptz
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

  if p_limit is null or p_limit < 1 or p_limit > 101 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  -- Parent must be an active root in this organization (no cross-org/parent leak).
  if not exists (
    select 1
    from public.crm_projects parent
    where parent.id = p_parent_project_id
      and parent.organization_id = p_organization_id
      and parent.parent_project_id is null
      and parent.archived_at is null
  ) then
    return;
  end if;

  if p_direction = 'backward' then
    return query
    select
      p.id,
      p.list_sort_bucket,
      p.last_activity_at
    from public.crm_projects p
    where p.organization_id = p_organization_id
      and p.archived_at is null
      and p.parent_project_id = p_parent_project_id
      and (
        not p_restrict_member_visibility
        or public.crm_member_can_see_project_via_tasks(
          p_organization_id,
          p.id,
          p_viewer_user_id,
          p_only_assigned_workflow,
          p_only_assigned_payments,
          p_include_payments,
          p_member_role_user_ids
        )
      )
      and public.crm_project_matches_list_v2_filters(
        p_organization_id,
        p.id,
        p_search_prefix,
        p_search_email,
        p_search_phone,
        p_stage_slugs,
        p_priorities,
        p_workflow_statuses
      )
      and (
        p_cursor_id is null
        or public.crm_list_v2_before_cursor(
          p.list_sort_bucket,
          p.last_activity_at,
          p.id,
          p_cursor_bucket,
          p_cursor_activity,
          p_cursor_id
        )
      )
    order by
      p.list_sort_bucket desc,
      p.last_activity_at asc nulls first,
      p.id asc
    limit p_limit;
  else
    return query
    select
      p.id,
      p.list_sort_bucket,
      p.last_activity_at
    from public.crm_projects p
    where p.organization_id = p_organization_id
      and p.archived_at is null
      and p.parent_project_id = p_parent_project_id
      and (
        not p_restrict_member_visibility
        or public.crm_member_can_see_project_via_tasks(
          p_organization_id,
          p.id,
          p_viewer_user_id,
          p_only_assigned_workflow,
          p_only_assigned_payments,
          p_include_payments,
          p_member_role_user_ids
        )
      )
      and public.crm_project_matches_list_v2_filters(
        p_organization_id,
        p.id,
        p_search_prefix,
        p_search_email,
        p_search_phone,
        p_stage_slugs,
        p_priorities,
        p_workflow_statuses
      )
      and (
        p_cursor_id is null
        or public.crm_list_v2_after_cursor(
          p.list_sort_bucket,
          p.last_activity_at,
          p.id,
          p_cursor_bucket,
          p_cursor_activity,
          p_cursor_id
        )
      )
    order by
      p.list_sort_bucket asc,
      p.last_activity_at desc nulls last,
      p.id desc
    limit p_limit;
  end if;
end;
$$;

comment on function public.crm_list_child_projects_page_v2 is
  'BuildCore Phase 2A: keyset page of direct Subprojects for one parent Project.';

revoke all on function public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) from public;
grant execute on function public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) to authenticated, service_role;

create or replace function public.crm_count_child_projects_v2(
  p_organization_id uuid,
  p_parent_project_id uuid,
  p_viewer_user_id uuid,
  p_restrict_member_visibility boolean,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_include_payments boolean,
  p_member_role_user_ids uuid[],
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[]
)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if auth.uid() is not null then
    if not public.crm_user_has_org_access(p_organization_id) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.crm_projects parent
    where parent.id = p_parent_project_id
      and parent.organization_id = p_organization_id
      and parent.parent_project_id is null
      and parent.archived_at is null
  ) then
    return 0;
  end if;

  select count(*)::bigint into v_count
  from public.crm_projects p
  where p.organization_id = p_organization_id
    and p.archived_at is null
    and p.parent_project_id = p_parent_project_id
    and (
      not p_restrict_member_visibility
      or public.crm_member_can_see_project_via_tasks(
        p_organization_id,
        p.id,
        p_viewer_user_id,
        p_only_assigned_workflow,
        p_only_assigned_payments,
        p_include_payments,
        p_member_role_user_ids
      )
    )
    and public.crm_project_matches_list_v2_filters(
      p_organization_id,
      p.id,
      p_search_prefix,
      p_search_email,
      p_search_phone,
      p_stage_slugs,
      p_priorities,
      p_workflow_statuses
    );

  return v_count;
end;
$$;

comment on function public.crm_count_child_projects_v2 is
  'BuildCore Phase 2A: exact count of direct Subprojects for one parent (same filters as page RPC).';

revoke all on function public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
) from public;
grant execute on function public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
) to authenticated, service_role;
