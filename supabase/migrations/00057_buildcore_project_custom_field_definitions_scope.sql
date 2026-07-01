-- ============================================================================
-- Scope project custom field definitions to parent projects vs subprojects.
-- Existing rows default to subproject (see migration comment in release notes).
-- ============================================================================

alter table public.buildcore_project_custom_field_definitions
  add column if not exists scope text not null default 'subproject';

alter table public.buildcore_project_custom_field_definitions
  drop constraint if exists buildcore_project_custom_field_defs_org_field_key_unique;

alter table public.buildcore_project_custom_field_definitions
  add constraint buildcore_project_custom_field_defs_org_scope_field_key_unique
  unique (organization_id, scope, field_key);

alter table public.buildcore_project_custom_field_definitions
  add constraint buildcore_project_custom_field_defs_scope_check
  check (scope in ('project', 'subproject'));

create index if not exists idx_buildcore_project_custom_field_defs_org_scope_active_order
  on public.buildcore_project_custom_field_definitions (organization_id, scope, is_archived, display_order);

comment on column public.buildcore_project_custom_field_definitions.scope is
  'Custom field context: project for parent CRM projects, subproject for child projects/leads.';
