-- =============================================================================
-- Spreadsheet import tracking (Phase 1 dual-mode importer)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Jobs
-- -----------------------------------------------------------------------------
create table if not exists public.crm_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  import_mode text not null
    check (import_mode in ('into_existing_parent', 'master_hierarchy')),
  fixed_parent_project_id uuid null references public.crm_projects (id) on delete set null,
  source_filename text not null,
  sheet_name text not null,
  header_row_index integer not null check (header_row_index >= 0),
  mapping_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in (
      'draft',
      'ready',
      'running',
      'partially_completed',
      'completed',
      'failed',
      'cancelled'
    )),
  idempotency_key text not null,
  execution_cursor jsonb not null default '{}'::jsonb,
  claim_owner text null,
  claim_expires_at timestamptz null,
  counts jsonb not null default '{}'::jsonb,
  error_summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_import_jobs_org_idempotency_unique unique (organization_id, idempotency_key),
  constraint crm_import_jobs_fixed_parent_mode_check check (
    (import_mode = 'into_existing_parent' and fixed_parent_project_id is not null)
    or (import_mode = 'master_hierarchy')
  )
);

comment on table public.crm_import_jobs is
  'Spreadsheet import jobs. Authoritative Phase 1 audit trail (org-level accountability deferred).';

create index if not exists idx_crm_import_jobs_org_created
  on public.crm_import_jobs (organization_id, created_at desc);

create index if not exists idx_crm_import_jobs_org_status
  on public.crm_import_jobs (organization_id, status);

create index if not exists idx_crm_import_jobs_fixed_parent
  on public.crm_import_jobs (fixed_parent_project_id);

drop trigger if exists crm_import_jobs_set_updated_at on public.crm_import_jobs;
create trigger crm_import_jobs_set_updated_at
  before update on public.crm_import_jobs
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_import_jobs enable row level security;

create policy crm_import_jobs_select_org
  on public.crm_import_jobs for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_import_jobs_insert_org
  on public.crm_import_jobs for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_import_jobs_update_org
  on public.crm_import_jobs for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Parent groups
-- -----------------------------------------------------------------------------
create table if not exists public.crm_import_parent_groups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.crm_import_jobs (id) on delete cascade,
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  group_key text not null,
  raw_identifier text null,
  display_parent_name text not null,
  resolution_type text null
    check (resolution_type is null or resolution_type in ('create_new', 'attach_existing', 'ignore')),
  existing_parent_project_id uuid null references public.crm_projects (id) on delete set null,
  created_parent_project_id uuid null references public.crm_projects (id) on delete set null,
  conflict_state jsonb not null default '{}'::jsonb,
  resolved_parent_attributes jsonb not null default '{}'::jsonb,
  status text not null default 'unresolved'
    check (status in (
      'unresolved',
      'ready',
      'ignored',
      'running',
      'completed',
      'partially_completed',
      'failed'
    )),
  error_summary text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_import_parent_groups_job_key_unique unique (job_id, group_key)
);

comment on table public.crm_import_parent_groups is
  'Detected parent groups for a spreadsheet import job (Mode 1 uses one fixed group).';

create index if not exists idx_crm_import_parent_groups_job_status
  on public.crm_import_parent_groups (job_id, status);

create index if not exists idx_crm_import_parent_groups_org_job
  on public.crm_import_parent_groups (organization_id, job_id);

drop trigger if exists crm_import_parent_groups_set_updated_at on public.crm_import_parent_groups;
create trigger crm_import_parent_groups_set_updated_at
  before update on public.crm_import_parent_groups
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_import_parent_groups enable row level security;

create policy crm_import_parent_groups_select_org
  on public.crm_import_parent_groups for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_import_parent_groups_insert_org
  on public.crm_import_parent_groups for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_import_parent_groups_update_org
  on public.crm_import_parent_groups for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Source rows (one DB row per spreadsheet data row)
-- -----------------------------------------------------------------------------
create table if not exists public.crm_import_job_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.crm_import_jobs (id) on delete cascade,
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  parent_group_id uuid not null references public.crm_import_parent_groups (id) on delete cascade,
  source_row_index integer not null check (source_row_index >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'excluded', 'invalid', 'running', 'succeeded', 'failed')),
  excluded boolean not null default false,
  created_subproject_id uuid null references public.crm_projects (id) on delete set null,
  warning_codes text[] not null default '{}'::text[],
  error_codes text[] not null default '{}'::text[],
  error_message text null,
  dedupe_fingerprint jsonb not null default '{}'::jsonb,
  claim_token text null,
  claim_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_import_job_rows_job_source_unique unique (job_id, source_row_index)
);

comment on table public.crm_import_job_rows is
  'Per-source-row outcomes for spreadsheet import (idempotency, resume, future undo/dedupe).';

create index if not exists idx_crm_import_job_rows_job_status
  on public.crm_import_job_rows (job_id, status);

create index if not exists idx_crm_import_job_rows_group_status
  on public.crm_import_job_rows (parent_group_id, status);

create index if not exists idx_crm_import_job_rows_job_excluded
  on public.crm_import_job_rows (job_id, excluded);

drop trigger if exists crm_import_job_rows_set_updated_at on public.crm_import_job_rows;
create trigger crm_import_job_rows_set_updated_at
  before update on public.crm_import_job_rows
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_import_job_rows enable row level security;

create policy crm_import_job_rows_select_org
  on public.crm_import_job_rows for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_import_job_rows_insert_org
  on public.crm_import_job_rows for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_import_job_rows_update_org
  on public.crm_import_job_rows for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
