-- Manual workflow stage completions (empty stages marked complete without tasks).

create table if not exists public.crm_project_stage_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.platform_organizations (id) on delete cascade,
  project_id uuid not null
    references public.crm_projects (id) on delete cascade,
  stage_slug text not null,
  completed_at timestamptz not null default now(),
  completed_by uuid references auth.users (id) on delete set null,
  source text not null default 'manual'
    check (source in ('manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stage_slug)
);

comment on table public.crm_project_stage_completions is
  'Manual completion records for workflow pipeline stages (e.g. empty stages skipped without tasks).';

create index if not exists idx_crm_project_stage_completions_org_project
  on public.crm_project_stage_completions (organization_id, project_id);

create index if not exists idx_crm_project_stage_completions_project_stage
  on public.crm_project_stage_completions (project_id, stage_slug);

drop trigger if exists crm_project_stage_completions_set_updated_at on public.crm_project_stage_completions;
create trigger crm_project_stage_completions_set_updated_at
  before update on public.crm_project_stage_completions
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_project_stage_completions enable row level security;

create policy crm_project_stage_completions_select_org
  on public.crm_project_stage_completions for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_project_stage_completions_insert_org
  on public.crm_project_stage_completions for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_project_stage_completions_update_org
  on public.crm_project_stage_completions for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_project_stage_completions_delete_org
  on public.crm_project_stage_completions for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
