-- ============================================================================
-- BuildCore — organization-scoped project templates (workflow tasks + payments blueprints)
-- ============================================================================

create table if not exists public.buildcore_project_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  name text not null,
  workflow_tasks_payload jsonb not null default '[]'::jsonb,
  payments_payload jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_project_templates_name_not_blank check (char_length(trim(name)) > 0)
);

comment on table public.buildcore_project_templates is
  'Reusable project blueprints: workflow task and payment definitions without project-specific data.';

comment on column public.buildcore_project_templates.workflow_tasks_payload is
  'JSON array of workflow task blueprint items (stageKey, taskName, documentsRequired).';

comment on column public.buildcore_project_templates.payments_payload is
  'JSON array of payment blueprint items (title, amount, documentsRequired).';

create index if not exists idx_buildcore_project_templates_organization_id
  on public.buildcore_project_templates (organization_id);

create index if not exists idx_buildcore_project_templates_org_created_at
  on public.buildcore_project_templates (organization_id, created_at desc);

drop trigger if exists buildcore_project_templates_set_updated_at on public.buildcore_project_templates;
create trigger buildcore_project_templates_set_updated_at
  before update on public.buildcore_project_templates
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_project_templates enable row level security;

create policy buildcore_project_templates_select_org
  on public.buildcore_project_templates for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_templates_insert_org
  on public.buildcore_project_templates for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_templates_update_org
  on public.buildcore_project_templates for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_project_templates_delete_org
  on public.buildcore_project_templates for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
