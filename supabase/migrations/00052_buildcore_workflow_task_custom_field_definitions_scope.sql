-- ============================================================================
-- Scope workflow task custom field definitions to workflow tasks vs payments.
-- Existing rows are workflow-task fields (backfilled via column default).
-- ============================================================================

alter table public.buildcore_workflow_task_custom_field_definitions
  add column if not exists scope text not null default 'workflow_task';

alter table public.buildcore_workflow_task_custom_field_definitions
  drop constraint if exists buildcore_wt_custom_field_defs_org_field_key_unique;

alter table public.buildcore_workflow_task_custom_field_definitions
  add constraint buildcore_wt_custom_field_defs_org_scope_field_key_unique
  unique (organization_id, scope, field_key);

alter table public.buildcore_workflow_task_custom_field_definitions
  add constraint buildcore_wt_custom_field_defs_scope_check
  check (scope in ('workflow_task', 'payment'));

create index if not exists idx_buildcore_wt_custom_field_defs_org_scope_active_order
  on public.buildcore_workflow_task_custom_field_definitions (organization_id, scope, is_archived, display_order);

comment on column public.buildcore_workflow_task_custom_field_definitions.scope is
  'Custom field context: workflow_task for operational tasks, payment for payment milestones.';
