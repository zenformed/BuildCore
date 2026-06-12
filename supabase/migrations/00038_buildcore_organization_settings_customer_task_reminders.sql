-- ============================================================================
-- BuildCore organization settings (alerts) + customer task reminder tracking.
-- ============================================================================

create table if not exists public.buildcore_organization_settings (
  organization_id uuid primary key references public.platform_organizations (id) on delete cascade,
  customer_task_reminders_enabled boolean not null default true,
  customer_task_reminder_frequency_minutes integer not null default 1440
    check (customer_task_reminder_frequency_minutes in (1, 1440, 4320, 10080, 43200)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.buildcore_organization_settings is
  'BuildCore organization-level settings (alerts, reminders, future workflow config).';

comment on column public.buildcore_organization_settings.customer_task_reminders_enabled is
  'When true, eligible customer-assigned workflow tasks receive automatic reminder emails.';

comment on column public.buildcore_organization_settings.customer_task_reminder_frequency_minutes is
  'Minutes between customer task reminder emails (1=testing, 1440=24h, 4320=3d, 10080=1w, 43200=1mo).';

drop trigger if exists buildcore_organization_settings_set_updated_at on public.buildcore_organization_settings;
create trigger buildcore_organization_settings_set_updated_at
  before update on public.buildcore_organization_settings
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_organization_settings enable row level security;

create policy buildcore_organization_settings_select_org
  on public.buildcore_organization_settings for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_organization_settings_insert_org
  on public.buildcore_organization_settings for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_organization_settings_update_org
  on public.buildcore_organization_settings for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

alter table public.crm_workflow_tasks
  add column if not exists last_reminder_sent_at timestamptz,
  add column if not exists reminder_count integer not null default 0;

comment on column public.crm_workflow_tasks.last_reminder_sent_at is
  'Timestamp of the last customer task reminder email (initial assignment sets baseline).';

comment on column public.crm_workflow_tasks.reminder_count is
  'Count of automatic customer task reminder emails sent for this task.';

create index if not exists idx_crm_workflow_tasks_customer_reminder_eligible
  on public.crm_workflow_tasks (organization_id, status)
  where assigned_contact_id is not null and archived_at is null;
