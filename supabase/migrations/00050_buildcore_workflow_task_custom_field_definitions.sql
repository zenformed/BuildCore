-- ============================================================================
-- BuildCore workflow task custom field definitions (org-scoped schema).
-- Separate from buildcore_field_labels (core column rename only).
-- ============================================================================

create table if not exists public.buildcore_workflow_task_custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null default 'text',
  options jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  is_archived boolean not null default false,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_wt_custom_field_defs_org_field_key_unique unique (organization_id, field_key),
  constraint buildcore_wt_custom_field_defs_label_nonempty check (char_length(trim(label)) > 0),
  constraint buildcore_wt_custom_field_defs_label_max_length check (char_length(trim(label)) <= 80),
  constraint buildcore_wt_custom_field_defs_field_key_format check (field_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint buildcore_wt_custom_field_defs_field_type_check check (field_type in ('text')),
  constraint buildcore_wt_custom_field_defs_source_check check (source in ('user', 'import'))
);

comment on table public.buildcore_workflow_task_custom_field_definitions is
  'Organization-defined custom fields for workflow tasks. Values live in buildcore_workflow_task_custom_field_values.';

create index if not exists idx_buildcore_wt_custom_field_defs_organization_id
  on public.buildcore_workflow_task_custom_field_definitions (organization_id);

create index if not exists idx_buildcore_wt_custom_field_defs_org_active_order
  on public.buildcore_workflow_task_custom_field_definitions (organization_id, is_archived, display_order);

drop trigger if exists buildcore_wt_custom_field_defs_set_updated_at
  on public.buildcore_workflow_task_custom_field_definitions;
create trigger buildcore_wt_custom_field_defs_set_updated_at
  before update on public.buildcore_workflow_task_custom_field_definitions
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_workflow_task_custom_field_definitions enable row level security;

create policy buildcore_wt_custom_field_defs_select_org
  on public.buildcore_workflow_task_custom_field_definitions for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_wt_custom_field_defs_insert_org
  on public.buildcore_workflow_task_custom_field_definitions for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_wt_custom_field_defs_update_org
  on public.buildcore_workflow_task_custom_field_definitions for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
