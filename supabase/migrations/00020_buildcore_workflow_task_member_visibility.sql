-- Org-level workflow task visibility rule for BuildCore member role viewers.
create table if not exists public.buildcore_workflow_task_visibility_settings (
  organization_id uuid primary key references public.platform_organizations (id) on delete cascade,
  only_assigned_user_can_view boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.buildcore_workflow_task_visibility_settings is
  'BuildCore workflow task visibility for organization members (member org role).';

comment on column public.buildcore_workflow_task_visibility_settings.only_assigned_user_can_view is
  'When true, member-role users only see workflow tasks assigned to themselves.';

drop trigger if exists buildcore_workflow_task_visibility_settings_set_updated_at
  on public.buildcore_workflow_task_visibility_settings;
create trigger buildcore_workflow_task_visibility_settings_set_updated_at
  before update on public.buildcore_workflow_task_visibility_settings
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_workflow_task_visibility_settings enable row level security;

create policy buildcore_workflow_task_visibility_settings_select_org
  on public.buildcore_workflow_task_visibility_settings for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_workflow_task_visibility_settings_insert_org
  on public.buildcore_workflow_task_visibility_settings for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_workflow_task_visibility_settings_update_org
  on public.buildcore_workflow_task_visibility_settings for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
