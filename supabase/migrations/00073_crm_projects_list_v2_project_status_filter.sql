-- ============================================================================
-- Projects/Subprojects list v2: filter by crm_projects.project_status
--
-- Adds p_project_statuses to match helpers + roots/children page/count RPCs.
-- Empty/null array = no status filter (All). Non-empty = row's project_status must match.
--
-- Roots: status applies to the listed root row only (not parent-kept via children).
-- Other filters retain existing root-OR-child match semantics.
-- ============================================================================

-- Drop dependents that reference the old match signatures, then recreate.
drop function if exists public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
);
drop function if exists public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
  int, text, smallint, timestamptz, uuid
);
drop function if exists public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
);
drop function if exists public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
  int, text, smallint, timestamptz, uuid
);
drop function if exists public.crm_root_matches_list_v2(
  uuid, uuid, text, text, text, text[], text[], text[]
);
drop function if exists public.crm_project_matches_list_v2_filters(
  uuid, uuid, text, text, text, text[], text[], text[]
);

create or replace function public.crm_project_matches_list_v2_filters(
  p_organization_id uuid,
  p_project_id uuid,
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[],
  p_project_statuses text[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_priority text;
  v_project_status text;
  v_derived text;
begin
  select p.priority, p.project_status
    into v_priority, v_project_status
  from public.crm_projects p
  where p.id = p_project_id
    and p.organization_id = p_organization_id
    and p.archived_at is null;

  if v_priority is null then
    return false;
  end if;

  if p_project_statuses is not null and cardinality(p_project_statuses) > 0 then
    if v_project_status is null or not (v_project_status = any (p_project_statuses)) then
      return false;
    end if;
  end if;

  if p_priorities is not null and cardinality(p_priorities) > 0 then
    if not (
      ( 'urgent' = any (p_priorities) and v_priority = 'urgent' )
      or ( 'normal' = any (p_priorities) and v_priority is distinct from 'urgent' )
    ) then
      return false;
    end if;
  end if;

  if p_stage_slugs is not null and cardinality(p_stage_slugs) > 0 then
    v_derived := public.crm_project_derived_stage_slug(p_organization_id, p_project_id);
    if not (v_derived = any (p_stage_slugs)) then
      return false;
    end if;
  end if;

  if p_workflow_statuses is not null and cardinality(p_workflow_statuses) > 0 then
    if not exists (
      select 1
      from public.crm_workflow_tasks t
      where t.organization_id = p_organization_id
        and t.project_id = p_project_id
        and t.archived_at is null
        and t.status = any (p_workflow_statuses)
    ) then
      return false;
    end if;
  end if;

  if p_search_prefix is not null and length(p_search_prefix) >= 2 then
    if not (
      exists (
        select 1
        from public.crm_record_identity_values iv
        where iv.organization_id = p_organization_id
          and iv.record_id = p_project_id
          and iv.value_type in ('name', 'email', 'phone', 'address')
          and (
            iv.normalized_value like (p_search_prefix || '%')
            or (p_search_email is not null and iv.value_type = 'email' and iv.normalized_value = p_search_email)
            or (p_search_phone is not null and iv.value_type = 'phone' and iv.normalized_value = p_search_phone)
          )
      )
      or exists (
        select 1
        from public.crm_projects p
        where p.id = p_project_id
          and p.organization_id = p_organization_id
          and lower(p.name) like (p_search_prefix || '%')
      )
      or exists (
        select 1
        from public.crm_projects p
        join public.crm_clients cl on cl.id = p.client_id
        where p.id = p_project_id
          and p.organization_id = p_organization_id
          and lower(cl.company_name) like (p_search_prefix || '%')
      )
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.crm_project_matches_list_v2_filters(
  uuid, uuid, text, text, text, text[], text[], text[], text[]
) from public;
grant execute on function public.crm_project_matches_list_v2_filters(
  uuid, uuid, text, text, text, text[], text[], text[], text[]
) to authenticated;

-- Root status filter is on the listed root only; other filters keep parent-kept OR semantics.
create or replace function public.crm_root_matches_list_v2(
  p_organization_id uuid,
  p_root_id uuid,
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[],
  p_project_statuses text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_project_statuses is null
      or cardinality(p_project_statuses) = 0
      or exists (
        select 1
        from public.crm_projects r
        where r.id = p_root_id
          and r.organization_id = p_organization_id
          and r.archived_at is null
          and r.project_status = any (p_project_statuses)
      )
    )
    and (
      public.crm_project_matches_list_v2_filters(
        p_organization_id,
        p_root_id,
        p_search_prefix,
        p_search_email,
        p_search_phone,
        p_stage_slugs,
        p_priorities,
        p_workflow_statuses,
        null
      )
      or exists (
        select 1
        from public.crm_projects c
        where c.organization_id = p_organization_id
          and c.parent_project_id = p_root_id
          and c.archived_at is null
          and public.crm_project_matches_list_v2_filters(
            p_organization_id,
            c.id,
            p_search_prefix,
            p_search_email,
            p_search_phone,
            p_stage_slugs,
            p_priorities,
            p_workflow_statuses,
            null
          )
      )
    );
$$;

revoke all on function public.crm_root_matches_list_v2(
  uuid, uuid, text, text, text, text[], text[], text[], text[]
) from public;
grant execute on function public.crm_root_matches_list_v2(
  uuid, uuid, text, text, text, text[], text[], text[], text[]
) to authenticated, service_role;

create or replace function public.crm_list_root_projects_page_v2(
  p_organization_id uuid,
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
  p_project_statuses text[],
  p_limit int,
  p_direction text,
  p_cursor_bucket smallint,
  p_cursor_activity timestamptz,
  p_cursor_id uuid
)
returns table (
  id uuid,
  list_sort_bucket smallint,
  last_activity_at timestamptz,
  child_count int
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

  if p_direction = 'backward' then
    return query
    select
      p.id,
      p.list_sort_bucket,
      p.last_activity_at,
      (
        select count(*)::int
        from public.crm_projects c
        where c.organization_id = p_organization_id
          and c.parent_project_id = p.id
          and c.archived_at is null
      ) as child_count
    from public.crm_projects p
    where p.organization_id = p_organization_id
      and p.archived_at is null
      and p.parent_project_id is null
      and (
        not p_restrict_member_visibility
        or public.crm_member_can_access_root_project(
          p_organization_id,
          p.id,
          p_viewer_user_id,
          p_only_assigned_workflow,
          p_only_assigned_payments,
          p_include_payments,
          p_member_role_user_ids
        )
      )
      and public.crm_root_matches_list_v2(
        p_organization_id,
        p.id,
        p_search_prefix,
        p_search_email,
        p_search_phone,
        p_stage_slugs,
        p_priorities,
        p_workflow_statuses,
        p_project_statuses
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
      p.last_activity_at,
      (
        select count(*)::int
        from public.crm_projects c
        where c.organization_id = p_organization_id
          and c.parent_project_id = p.id
          and c.archived_at is null
      ) as child_count
    from public.crm_projects p
    where p.organization_id = p_organization_id
      and p.archived_at is null
      and p.parent_project_id is null
      and (
        not p_restrict_member_visibility
        or public.crm_member_can_access_root_project(
          p_organization_id,
          p.id,
          p_viewer_user_id,
          p_only_assigned_workflow,
          p_only_assigned_payments,
          p_include_payments,
          p_member_role_user_ids
        )
      )
      and public.crm_root_matches_list_v2(
        p_organization_id,
        p.id,
        p_search_prefix,
        p_search_email,
        p_search_phone,
        p_stage_slugs,
        p_priorities,
        p_workflow_statuses,
        p_project_statuses
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

comment on function public.crm_list_root_projects_page_v2 is
  'BuildCore list v2: keyset page of root CRM projects with filters/search/visibility/project_status.';

revoke all on function public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) from public;
grant execute on function public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) to authenticated, service_role;

create or replace function public.crm_count_root_projects_v2(
  p_organization_id uuid,
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
  p_project_statuses text[]
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

  select count(*)::bigint into v_count
  from public.crm_projects p
  where p.organization_id = p_organization_id
    and p.archived_at is null
    and p.parent_project_id is null
    and (
      not p_restrict_member_visibility
      or public.crm_member_can_access_root_project(
        p_organization_id,
        p.id,
        p_viewer_user_id,
        p_only_assigned_workflow,
        p_only_assigned_payments,
        p_include_payments,
        p_member_role_user_ids
      )
    )
    and public.crm_root_matches_list_v2(
      p_organization_id,
      p.id,
      p_search_prefix,
      p_search_email,
      p_search_phone,
      p_stage_slugs,
      p_priorities,
      p_workflow_statuses,
      p_project_statuses
    );

  return v_count;
end;
$$;

comment on function public.crm_count_root_projects_v2 is
  'BuildCore list v2: exact count of root CRM projects for the same filters as the page RPC.';

revoke all on function public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) from public;
grant execute on function public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) to authenticated, service_role;

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
  p_project_statuses text[],
  p_limit int,
  p_direction text,
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
        p_workflow_statuses,
        p_project_statuses
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
        p_workflow_statuses,
        p_project_statuses
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
  'BuildCore list v2: keyset page of direct Subprojects with filters including project_status.';

revoke all on function public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) from public;
grant execute on function public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
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
  p_workflow_statuses text[],
  p_project_statuses text[]
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
      p_workflow_statuses,
      p_project_statuses
    );

  return v_count;
end;
$$;

comment on function public.crm_count_child_projects_v2 is
  'BuildCore list v2: exact count of direct Subprojects (same filters as page RPC, including project_status).';

revoke all on function public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) from public;
grant execute on function public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) to authenticated, service_role;
