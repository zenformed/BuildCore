-- Project/customer completion (BuildCore CRM)

alter table public.crm_projects
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users (id) on delete set null;

comment on column public.crm_projects.completed_at is
  'When the project/customer was marked complete; NULL = incomplete.';

comment on column public.crm_projects.completed_by is
  'auth.users id of the member who marked the project complete.';

create index if not exists idx_crm_projects_org_completed
  on public.crm_projects (organization_id, completed_at)
  where archived_at is null and completed_at is not null;
