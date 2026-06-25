-- ============================================================================
-- BuildCore role permissions: Send Files column (external attachment email)
-- Domains: workflow_tasks, payments, budget
-- ============================================================================

alter table public.buildcore_role_permissions
  add column if not exists can_send_files boolean not null default false;

comment on column public.buildcore_role_permissions.can_send_files is
  'Allow sending attachments externally (email) for this permission domain.';

-- Existing persisted rows: admin/coordinator enabled; member stays false.
update public.buildcore_role_permissions
  set can_send_files = true
  where role_key in ('admin', 'coordinator');
