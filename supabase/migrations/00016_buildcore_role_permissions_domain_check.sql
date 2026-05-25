-- ============================================================================
-- Expand buildcore_role_permissions.permission_domain if 00015 was applied earlier
-- with workflow_tasks-only check. Safe to run when 00015 already ran or not.
-- ============================================================================

alter table public.buildcore_role_permissions
  drop constraint if exists buildcore_role_permissions_permission_domain_check;

alter table public.buildcore_role_permissions
  add constraint buildcore_role_permissions_permission_domain_check
  check (permission_domain in ('workflow_tasks', 'payments', 'budget'));

create index if not exists idx_buildcore_role_permissions_org_domain
  on public.buildcore_role_permissions (organization_id, permission_domain);
