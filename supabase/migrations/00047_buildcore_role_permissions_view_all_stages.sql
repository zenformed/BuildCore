-- ============================================================================
-- BuildCore role permissions: View All Stages column
-- Domains: workflow_tasks, payments (UI); budget column stored but unused
-- ============================================================================

alter table public.buildcore_role_permissions
  add column if not exists can_view_all_stages boolean not null default false;

comment on column public.buildcore_role_permissions.can_view_all_stages is
  'When true, users see all stage/group headers even when they have no visible rows in that stage.';

-- Admin/coordinator keep full stage visibility (existing behavior).
update public.buildcore_role_permissions
  set can_view_all_stages = true
  where role_key in ('admin', 'coordinator');

-- Member defaults remain false (hide empty stages unless toggled on).
