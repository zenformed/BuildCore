-- ============================================================================
-- BuildCore app-level role permissions (per organization, per domain)
--
-- Domains: workflow_tasks (in use), payments and budget reserved for later.
-- Writes are performed via ZenformedCore service role; authenticated users may SELECT
-- rows for their organization (BFF reads). PATCH upserts through Core API only.
-- ============================================================================

create table if not exists public.buildcore_role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  role_key text not null check (role_key in ('admin', 'coordinator', 'member')),
  permission_domain text not null check (
    permission_domain in ('workflow_tasks', 'payments', 'budget')
  ),
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  can_upload boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_role_permissions_org_role_domain_unique
    unique (organization_id, role_key, permission_domain)
);

comment on table public.buildcore_role_permissions is
  'BuildCore app permissions by organization role and permission domain.';

comment on column public.buildcore_role_permissions.permission_domain is
  'workflow_tasks | payments | budget — only workflow_tasks is wired in UI/API today.';

create index if not exists idx_buildcore_role_permissions_organization_id
  on public.buildcore_role_permissions (organization_id);

create index if not exists idx_buildcore_role_permissions_org_domain
  on public.buildcore_role_permissions (organization_id, permission_domain);

drop trigger if exists buildcore_role_permissions_set_updated_at on public.buildcore_role_permissions;
create trigger buildcore_role_permissions_set_updated_at
  before update on public.buildcore_role_permissions
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_role_permissions enable row level security;

-- Read: org members with JWT (optional direct client reads). Mutations: service role via ZenformedCore only.
create policy buildcore_role_permissions_select_org
  on public.buildcore_role_permissions for select to authenticated
  using (public.crm_user_has_org_access(organization_id));
