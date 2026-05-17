-- ============================================================================
-- BuildCore CRM — foundational schema (Phase 7A)
--
-- Additive tables for BuildCore consuming app. Does not modify ForgeCore
-- work_orders, profiles, or platform_* tables.
--
-- Prerequisites (shared Supabase project):
--   - public.platform_organizations
--   - public.platform_organization_members
--   - auth.users
--
-- Money: bigint cents. Timestamps: timestamptz UTC (now()).
-- Member columns reference auth.users (resolved via org membership in app layer).
--
-- RLS: enabled in 00003_crm_rls.sql (deny-by-default until policies apply).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.crm_set_updated_at() is
  'BuildCore CRM: touch updated_at on row update.';

-- -----------------------------------------------------------------------------
-- 1) Clients
-- -----------------------------------------------------------------------------
create table if not exists public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  company_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_clients is
  'CRM customer / property-owner account scoped to a platform organization.';

create index if not exists idx_crm_clients_organization_id
  on public.crm_clients (organization_id);

create index if not exists idx_crm_clients_org_company_name
  on public.crm_clients (organization_id, company_name);

drop trigger if exists crm_clients_set_updated_at on public.crm_clients;
create trigger crm_clients_set_updated_at
  before update on public.crm_clients
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Contacts
-- -----------------------------------------------------------------------------
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  client_id uuid references public.crm_clients (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  role_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_contacts is
  'CRM contact persons; optionally linked to a client.';

comment on column public.crm_contacts.role_title is
  'Job title or role (maps to domain CrmContact.title).';

create index if not exists idx_crm_contacts_organization_id
  on public.crm_contacts (organization_id);

create index if not exists idx_crm_contacts_client_id
  on public.crm_contacts (client_id);

create index if not exists idx_crm_contacts_org_email
  on public.crm_contacts (organization_id, email);

drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
create trigger crm_contacts_set_updated_at
  before update on public.crm_contacts
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 3) Pipeline stages (org overrides + global defaults)
-- -----------------------------------------------------------------------------
create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.platform_organizations (id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_pipeline_stages is
  'Pipeline stage catalog. organization_id NULL = global default row (seeded).';

comment on column public.crm_pipeline_stages.organization_id is
  'NULL for suite-wide defaults; set for per-organization overrides (future).';

create unique index if not exists crm_pipeline_stages_global_slug_uidx
  on public.crm_pipeline_stages (slug)
  where organization_id is null;

create unique index if not exists crm_pipeline_stages_org_slug_uidx
  on public.crm_pipeline_stages (organization_id, slug)
  where organization_id is not null;

create index if not exists idx_crm_pipeline_stages_org_active_sort
  on public.crm_pipeline_stages (organization_id, is_active, sort_order);

drop trigger if exists crm_pipeline_stages_set_updated_at on public.crm_pipeline_stages;
create trigger crm_pipeline_stages_set_updated_at
  before update on public.crm_pipeline_stages
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 4) Projects
-- -----------------------------------------------------------------------------
create table if not exists public.crm_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  client_id uuid not null references public.crm_clients (id) on delete restrict,
  primary_contact_id uuid references public.crm_contacts (id) on delete set null,
  trade_type text not null default 'general-contractor'
    check (trade_type in (
      'hvac',
      'roofing',
      'restoration',
      'inspections',
      'make-ready',
      'general-contractor'
    )),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  current_stage_slug text not null,
  waiting_on text,
  notes text,
  deal_value_cents bigint not null default 0 check (deal_value_cents >= 0),
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  assigned_member_id uuid references auth.users (id) on delete set null,
  last_activity_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_projects_org_slug_unique unique (organization_id, slug)
);

comment on table public.crm_projects is
  'CRM project / job hub (list + detail). Soft-delete via archived_at.';

comment on column public.crm_projects.balance_cents is
  'Remaining balance in cents (maps to domain balanceRemainingCents).';

comment on column public.crm_projects.last_activity_at is
  'Last meaningful activity; maps to domain lastUpdatedAt for list sorting.';

comment on column public.crm_projects.trade_type is
  'Trade vertical for filtering/display (domain CrmTradeType).';

create index if not exists idx_crm_projects_organization_id
  on public.crm_projects (organization_id);

create index if not exists idx_crm_projects_org_last_activity
  on public.crm_projects (organization_id, last_activity_at desc);

create index if not exists idx_crm_projects_org_stage
  on public.crm_projects (organization_id, current_stage_slug);

create index if not exists idx_crm_projects_org_priority
  on public.crm_projects (organization_id, priority);

create index if not exists idx_crm_projects_org_assigned
  on public.crm_projects (organization_id, assigned_member_id);

create index if not exists idx_crm_projects_active_list
  on public.crm_projects (organization_id, last_activity_at desc)
  where archived_at is null;

create index if not exists idx_crm_projects_client_id
  on public.crm_projects (client_id);

drop trigger if exists crm_projects_set_updated_at on public.crm_projects;
create trigger crm_projects_set_updated_at
  before update on public.crm_projects
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 5) Workflow tasks
-- -----------------------------------------------------------------------------
create table if not exists public.crm_workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  title text not null,
  stage_slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'blocked', 'done', 'skipped')),
  due_at timestamptz,
  notes text,
  assigned_member_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  completed_by_member_id uuid references auth.users (id) on delete set null,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_workflow_tasks is
  'Per-project workflow tasks; documents attach here (see crm_documents).';

create index if not exists idx_crm_workflow_tasks_project_id
  on public.crm_workflow_tasks (project_id, sort_order);

create index if not exists idx_crm_workflow_tasks_org_project
  on public.crm_workflow_tasks (organization_id, project_id);

create index if not exists idx_crm_workflow_tasks_org_stage
  on public.crm_workflow_tasks (organization_id, stage_slug);

create index if not exists idx_crm_workflow_tasks_active_project
  on public.crm_workflow_tasks (project_id, sort_order)
  where archived_at is null;

drop trigger if exists crm_workflow_tasks_set_updated_at on public.crm_workflow_tasks;
create trigger crm_workflow_tasks_set_updated_at
  before update on public.crm_workflow_tasks
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 6) Documents (task-attached)
-- -----------------------------------------------------------------------------
create table if not exists public.crm_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  workflow_task_id uuid not null references public.crm_workflow_tasks (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'estimate',
      'contract',
      'photo',
      'invoice',
      'permit',
      'inspection_report',
      'other'
    )),
  file_name text not null,
  storage_path text,
  mime_type text not null default 'application/octet-stream',
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  upload_status text not null default 'pending'
    check (upload_status in ('pending', 'ready', 'failed')),
  uploaded_by_member_id uuid not null references auth.users (id) on delete restrict,
  reviewed_by_member_id uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_documents is
  'Document metadata; binary in object storage (storage_path). Primary FK: workflow_task_id.';

comment on column public.crm_documents.project_id is
  'Denormalized for aggregate project document queries.';

create index if not exists idx_crm_documents_workflow_task_id
  on public.crm_documents (workflow_task_id);

create index if not exists idx_crm_documents_project_id
  on public.crm_documents (organization_id, project_id, created_at desc);

create index if not exists idx_crm_documents_upload_status
  on public.crm_documents (organization_id, upload_status);

drop trigger if exists crm_documents_set_updated_at on public.crm_documents;
create trigger crm_documents_set_updated_at
  before update on public.crm_documents
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 7) Milestones / payments
-- -----------------------------------------------------------------------------
create table if not exists public.crm_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  label text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  due_at timestamptz,
  paid_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'due', 'paid', 'waived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_milestones is
  'Per-project payment milestones (display + future invoicing integration).';

create index if not exists idx_crm_milestones_project_id
  on public.crm_milestones (project_id);

create index if not exists idx_crm_milestones_org_status
  on public.crm_milestones (organization_id, status);

drop trigger if exists crm_milestones_set_updated_at on public.crm_milestones;
create trigger crm_milestones_set_updated_at
  before update on public.crm_milestones
  for each row
  execute function public.crm_set_updated_at();

-- -----------------------------------------------------------------------------
-- 8) Accountability / audit events (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.crm_accountability_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  workflow_task_id uuid references public.crm_workflow_tasks (id) on delete set null,
  document_id uuid references public.crm_documents (id) on delete set null,
  actor_member_id uuid not null references auth.users (id) on delete restrict,
  event_type text not null,
  summary text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.crm_accountability_events is
  'Append-only audit log for CRM mutations (maps to domain accountabilityLog).';

create index if not exists idx_crm_accountability_events_project_created
  on public.crm_accountability_events (organization_id, project_id, created_at desc);

create index if not exists idx_crm_accountability_events_task_id
  on public.crm_accountability_events (workflow_task_id);

create index if not exists idx_crm_accountability_events_event_type
  on public.crm_accountability_events (organization_id, event_type);
