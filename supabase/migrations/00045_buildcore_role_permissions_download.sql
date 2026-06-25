-- ============================================================================
-- BuildCore role permissions: Download column (separate from View/Upload)
-- Domains: workflow_tasks, payments, budget
-- ============================================================================

alter table public.buildcore_role_permissions
  add column if not exists can_download boolean not null default false;

comment on column public.buildcore_role_permissions.can_download is
  'Allow downloading attachments for this permission domain.';

-- All roles default to download enabled (members need files assigned to them).
update public.buildcore_role_permissions
  set can_download = true
  where role_key in ('admin', 'coordinator', 'member');
