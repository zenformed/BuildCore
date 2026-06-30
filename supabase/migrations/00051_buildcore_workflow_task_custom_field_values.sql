-- ============================================================================
-- BuildCore workflow task custom field values (typed storage per task).
-- ============================================================================

create table if not exists public.buildcore_workflow_task_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  workflow_task_id uuid not null references public.crm_workflow_tasks (id) on delete cascade,
  field_definition_id uuid not null references public.buildcore_workflow_task_custom_field_definitions (id) on delete cascade,
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_wt_custom_field_values_task_field_unique unique (workflow_task_id, field_definition_id)
);

comment on table public.buildcore_workflow_task_custom_field_values is
  'Per-task values for org custom workflow task fields. Phase 1 uses value_text only.';

create index if not exists idx_buildcore_wt_custom_field_values_organization_id
  on public.buildcore_workflow_task_custom_field_values (organization_id);

create index if not exists idx_buildcore_wt_custom_field_values_workflow_task_id
  on public.buildcore_workflow_task_custom_field_values (workflow_task_id);

create index if not exists idx_buildcore_wt_custom_field_values_field_definition_id
  on public.buildcore_workflow_task_custom_field_values (field_definition_id);

drop trigger if exists buildcore_wt_custom_field_values_set_updated_at
  on public.buildcore_workflow_task_custom_field_values;
create trigger buildcore_wt_custom_field_values_set_updated_at
  before update on public.buildcore_workflow_task_custom_field_values
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_workflow_task_custom_field_values enable row level security;

create policy buildcore_wt_custom_field_values_select_org
  on public.buildcore_workflow_task_custom_field_values for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_wt_custom_field_values_insert_org
  on public.buildcore_workflow_task_custom_field_values for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_wt_custom_field_values_update_org
  on public.buildcore_workflow_task_custom_field_values for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_wt_custom_field_values_delete_org
  on public.buildcore_workflow_task_custom_field_values for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
