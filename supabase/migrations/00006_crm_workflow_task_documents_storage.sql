-- ============================================================================
-- BuildCore CRM — workflow task document storage metadata + org quotas
--
-- Metadata table: public.crm_documents (workflow-task-attached documents).
-- Binaries live in Supabase Storage bucket `buildcore-documents` (create in dashboard).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Organization document storage quota (per platform org)
-- -----------------------------------------------------------------------------
create table if not exists public.crm_organization_storage (
  organization_id uuid primary key
    references public.platform_organizations (id) on delete cascade,
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  storage_limit_bytes bigint not null default 10737418240 check (storage_limit_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_organization_storage is
  'BuildCore CRM: aggregate document storage bytes per organization.';

drop trigger if exists crm_organization_storage_set_updated_at on public.crm_organization_storage;
create trigger crm_organization_storage_set_updated_at
  before update on public.crm_organization_storage
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_organization_storage enable row level security;

create policy crm_organization_storage_select_org
  on public.crm_organization_storage for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_organization_storage_insert_org
  on public.crm_organization_storage for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_organization_storage_update_org
  on public.crm_organization_storage for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Extend crm_documents (workflow task documents metadata)
-- -----------------------------------------------------------------------------
alter table public.crm_documents
  add column if not exists safe_file_name text,
  add column if not exists storage_provider text,
  add column if not exists storage_bucket text,
  add column if not exists storage_key text,
  add column if not exists deleted_at timestamptz;

update public.crm_documents
set
  safe_file_name = coalesce(safe_file_name, file_name),
  storage_provider = coalesce(storage_provider, 'supabase'),
  storage_bucket = coalesce(storage_bucket, 'buildcore-documents'),
  storage_key = coalesce(storage_key, storage_path)
where safe_file_name is null
   or storage_provider is null
   or storage_bucket is null
   or storage_key is null;

create index if not exists idx_crm_documents_active_task
  on public.crm_documents (workflow_task_id)
  where deleted_at is null and upload_status = 'ready';

create index if not exists idx_crm_documents_active_project
  on public.crm_documents (organization_id, project_id, created_at desc)
  where deleted_at is null and upload_status = 'ready';
