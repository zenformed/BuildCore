-- Correct derived-stage behavior if an earlier 00071 that skipped empty stages was already applied.
-- Empty stages remain the current roadmap stage; Project Completed warnings stay task-count based.
-- Idempotent CREATE OR REPLACE.

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

    if v_task_count = 0 then
      return v_slug;
    end if;

    if v_done_count < v_task_count then
      return v_slug;
    end if;
  end loop;

  return 'complete';
end;
$$;

comment on function public.crm_project_derived_stage_slug(uuid, uuid) is
  'BuildCore list v2: derived workflow stage slug — empty stages remain current; parity with resolveDerivedWorkflowStageSlugFromProgressInput.';
