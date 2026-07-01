-- ============================================================================
-- BuildCore project custom field values (typed storage per project).
-- ============================================================================

create table if not exists public.buildcore_project_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  field_definition_id uuid not null references public.buildcore_project_custom_field_definitions (id) on delete cascade,
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_project_custom_field_values_project_field_unique unique (project_id, field_definition_id)
);

comment on table public.buildcore_project_custom_field_values is
  'Per-project values for org custom project fields. Phase 1 uses value_text only.';

create index if not exists idx_buildcore_project_custom_field_values_organization_id
  on public.buildcore_project_custom_field_values (organization_id);

create index if not exists idx_buildcore_project_custom_field_values_project_id
  on public.buildcore_project_custom_field_values (project_id);

create index if not exists idx_buildcore_project_custom_field_values_field_definition_id
  on public.buildcore_project_custom_field_values (field_definition_id);

drop trigger if exists buildcore_project_custom_field_values_set_updated_at
  on public.buildcore_project_custom_field_values;
create trigger buildcore_project_custom_field_values_set_updated_at
  before update on public.buildcore_project_custom_field_values
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_project_custom_field_values enable row level security;

create policy buildcore_project_custom_field_values_select_org
  on public.buildcore_project_custom_field_values for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_custom_field_values_insert_org
  on public.buildcore_project_custom_field_values for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_custom_field_values_update_org
  on public.buildcore_project_custom_field_values for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_custom_field_values_delete_org
  on public.buildcore_project_custom_field_values for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
