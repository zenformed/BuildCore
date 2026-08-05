-- ============================================================================
-- Phase 1A: Root Projects list v2 RPC (keyset + search + filters + visibility)
-- Additive. Requires 00064 list_sort_bucket.
-- ============================================================================

-- Active workflow stages for derived-stage calculation (excludes payments + complete).
create or replace function public.crm_project_active_stage_slugs(
  p_organization_id uuid,
  p_stage_scope text
)
returns table (slug text, sort_order int)
language sql
stable
security definer
set search_path = public
as $$
  select s.slug, s.sort_order
  from public.crm_pipeline_stages s
  where s.organization_id = p_organization_id
    and s.stage_scope = p_stage_scope
    and s.is_active = true
    and s.slug not in ('payments', 'complete')
  order by s.sort_order asc, s.slug asc;
$$;

comment on function public.crm_project_active_stage_slugs(uuid, text) is
  'BuildCore list v2: active org pipeline stage slugs for derived stage (excludes payments/complete).';

revoke all on function public.crm_project_active_stage_slugs(uuid, text) from public;
grant execute on function public.crm_project_active_stage_slugs(uuid, text) to authenticated;

-- Derived stage: first incomplete active stage, else 'complete'.
-- Stage complete when: has ops tasks and all done, OR no tasks and manual completion exists.
create or replace function public.crm_project_derived_stage_slug(
  p_organization_id uuid,
  p_project_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text;
  v_slug text;
  v_task_count int;
  v_done_count int;
  v_manual boolean;
begin
  select case when parent_project_id is null then 'project' else 'subproject' end
    into v_scope
  from public.crm_projects
  where id = p_project_id
    and organization_id = p_organization_id
    and archived_at is null;

  if v_scope is null then
    return 'complete';
  end if;

  for v_slug in
    select s.slug
    from public.crm_project_active_stage_slugs(p_organization_id, v_scope) s
  loop
    select
      count(*)::int,
      count(*) filter (where t.status = 'done')::int
    into v_task_count, v_done_count
    from public.crm_workflow_tasks t
    where t.organization_id = p_organization_id
      and t.project_id = p_project_id
      and t.archived_at is null
      and t.stage_slug = v_slug
      and t.amount_cents is null;

    if v_task_count > 0 then
      if v_done_count < v_task_count then
        return v_slug;
      end if;
    else
      select exists (
        select 1
        from public.crm_project_stage_completions c
        where c.organization_id = p_organization_id
          and c.project_id = p_project_id
          and c.stage_slug = v_slug
      ) into v_manual;
      if not v_manual then
        return v_slug;
      end if;
    end if;
  end loop;

  return 'complete';
end;
$$;

comment on function public.crm_project_derived_stage_slug(uuid, uuid) is
  'BuildCore list v2: derived workflow stage slug (parity with resolveDerivedWorkflowStageSlugFromProgressInput).';

revoke all on function public.crm_project_derived_stage_slug(uuid, uuid) from public;
grant execute on function public.crm_project_derived_stage_slug(uuid, uuid) to authenticated;

-- Member-visible task on a project (ops or payments per flags).
create or replace function public.crm_member_can_see_project_via_tasks(
  p_organization_id uuid,
  p_project_id uuid,
  p_viewer_user_id uuid,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_include_payments boolean,
  p_member_role_user_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_workflow_tasks t
    where t.organization_id = p_organization_id
      and t.project_id = p_project_id
      and t.archived_at is null
      and t.assigned_contact_id is null
      and t.assigned_member_id is not null
      and (
        case
          when t.amount_cents is not null then
            p_include_payments
            and (
              case
                when p_only_assigned_payments then t.assigned_member_id = p_viewer_user_id
                else t.assigned_member_id = any (p_member_role_user_ids)
              end
            )
          else
            case
              when p_only_assigned_workflow then t.assigned_member_id = p_viewer_user_id
              else t.assigned_member_id = any (p_member_role_user_ids)
            end
        end
      )
  );
$$;

revoke all on function public.crm_member_can_see_project_via_tasks(
  uuid, uuid, uuid, boolean, boolean, boolean, uuid[]
) from public;
grant execute on function public.crm_member_can_see_project_via_tasks(
  uuid, uuid, uuid, boolean, boolean, boolean, uuid[]
) to authenticated;

-- Root accessible to member: direct task on root OR task on non-archived child.
create or replace function public.crm_member_can_access_root_project(
  p_organization_id uuid,
  p_root_project_id uuid,
  p_viewer_user_id uuid,
  p_only_assigned_workflow boolean,
  p_only_assigned_payments boolean,
  p_include_payments boolean,
  p_member_role_user_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.crm_member_can_see_project_via_tasks(
      p_organization_id,
      p_root_project_id,
      p_viewer_user_id,
      p_only_assigned_workflow,
      p_only_assigned_payments,
      p_include_payments,
      p_member_role_user_ids
    )
    or exists (
      select 1
      from public.crm_projects c
      where c.organization_id = p_organization_id
        and c.parent_project_id = p_root_project_id
        and c.archived_at is null
        and public.crm_member_can_see_project_via_tasks(
          p_organization_id,
          c.id,
          p_viewer_user_id,
          p_only_assigned_workflow,
          p_only_assigned_payments,
          p_include_payments,
          p_member_role_user_ids
        )
    );
$$;

revoke all on function public.crm_member_can_access_root_project(
  uuid, uuid, uuid, boolean, boolean, boolean, uuid[]
) from public;
grant execute on function public.crm_member_can_access_root_project(
  uuid, uuid, uuid, boolean, boolean, boolean, uuid[]
) to authenticated;

-- Predicate helpers: project row matches search / filters (single project id).
create or replace function public.crm_project_matches_list_v2_filters(
  p_organization_id uuid,
  p_project_id uuid,
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_priority text;
  v_derived text;
begin
  select p.priority into v_priority
  from public.crm_projects p
  where p.id = p_project_id
    and p.organization_id = p_organization_id
    and p.archived_at is null;

  if v_priority is null then
    return false;
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

  -- Indexed prefix / exact match via crm_record_identity_values
  -- (name, email, phone, address). Left-anchored project name + client
  -- company_name as bounded fallbacks (no unindexed %term% substring).
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
  uuid, uuid, text, text, text, text[], text[], text[]
) from public;
grant execute on function public.crm_project_matches_list_v2_filters(
  uuid, uuid, text, text, text, text[], text[], text[]
) to authenticated;

-- Root matches if root OR any non-archived child matches (dashboard parent-kept semantics).
create or replace function public.crm_root_matches_list_v2(
  p_organization_id uuid,
  p_root_id uuid,
  p_search_prefix text,
  p_search_email text,
  p_search_phone text,
  p_stage_slugs text[],
  p_priorities text[],
  p_workflow_statuses text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.crm_project_matches_list_v2_filters(
      p_organization_id,
      p_root_id,
      p_search_prefix,
      p_search_email,
      p_search_phone,
      p_stage_slugs,
      p_priorities,
      p_workflow_statuses
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
          p_workflow_statuses
        )
    );
$$;

revoke all on function public.crm_root_matches_list_v2(
  uuid, uuid, text, text, text, text[], text[], text[]
) from public;
grant execute on function public.crm_root_matches_list_v2(
  uuid, uuid, text, text, text, text[], text[], text[]
) to authenticated, service_role;

-- Forward keyset predicate for operational order.
create or replace function public.crm_list_v2_after_cursor(
  p_bucket smallint,
  p_activity timestamptz,
  p_id uuid,
  p_cursor_bucket smallint,
  p_cursor_activity timestamptz,
  p_cursor_id uuid
)
returns boolean
language sql
immutable
as $$
  select
    p_bucket > p_cursor_bucket
    or (
      p_bucket = p_cursor_bucket
      and (
        case
          when p_cursor_activity is null then
            p_activity is null and p_id < p_cursor_id
          else
            p_activity is null
            or p_activity < p_cursor_activity
            or (p_activity = p_cursor_activity and p_id < p_cursor_id)
        end
      )
    );
$$;

-- Backward keyset predicate (rows before cursor in operational order).
create or replace function public.crm_list_v2_before_cursor(
  p_bucket smallint,
  p_activity timestamptz,
  p_id uuid,
  p_cursor_bucket smallint,
  p_cursor_activity timestamptz,
  p_cursor_id uuid
)
returns boolean
language sql
immutable
as $$
  select
    p_bucket < p_cursor_bucket
    or (
      p_bucket = p_cursor_bucket
      and (
        case
          when p_cursor_activity is null then
            p_activity is not null
            or (p_activity is null and p_id > p_cursor_id)
          else
            (p_activity is not null and p_activity > p_cursor_activity)
            or (p_activity is not null and p_activity = p_cursor_activity and p_id > p_cursor_id)
        end
      )
    );
$$;

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
  p_limit int,
  p_direction text, -- 'forward' | 'backward'
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

comment on function public.crm_list_root_projects_page_v2 is
  'BuildCore Phase 1A: keyset page of root CRM projects with filters/search/visibility.';

revoke all on function public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) from public;
grant execute on function public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[],
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
      p_workflow_statuses
    );

  return v_count;
end;
$$;

comment on function public.crm_count_root_projects_v2 is
  'BuildCore Phase 1A: exact count of root CRM projects for the same filters as the page RPC.';

revoke all on function public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
) from public;
grant execute on function public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[]
) to authenticated, service_role;
