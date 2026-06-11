-- Direct upload architecture: project-level media, video document type, track-only storage.

-- Allow project-level documents (no workflow task or budget entry).
alter table public.crm_documents
  drop constraint if exists crm_documents_task_or_budget_chk;

alter table public.crm_documents
  drop constraint if exists crm_documents_attachment_chk;

alter table public.crm_documents
  add constraint crm_documents_attachment_chk
  check (
    (workflow_task_id is not null and budget_entry_id is null)
    or (workflow_task_id is null and budget_entry_id is not null)
    or (workflow_task_id is null and budget_entry_id is null)
  );

-- Video as first-class document type.
alter table public.crm_documents
  drop constraint if exists crm_documents_document_type_check;

alter table public.crm_documents
  add constraint crm_documents_document_type_check
  check (
    document_type in (
      'estimate',
      'contract',
      'photo',
      'video',
      'invoice',
      'permit',
      'inspection_report',
      'other'
    )
  );

create index if not exists idx_crm_documents_project_media
  on public.crm_documents (organization_id, project_id, created_at desc)
  where deleted_at is null
    and upload_status = 'ready'
    and workflow_task_id is null
    and budget_entry_id is null;

-- Launch: track usage without blocking uploads.
alter table public.crm_organization_storage
  add column if not exists storage_enforcement text not null default 'track_only'
  check (storage_enforcement in ('track_only', 'block'));

create or replace function public.crm_reserve_organization_storage(
  p_organization_id uuid,
  p_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
  v_limit bigint;
  v_enforcement text;
begin
  if p_bytes is null or p_bytes <= 0 then
    raise exception 'invalid_bytes';
  end if;

  if auth.uid() is not null and not public.crm_user_has_org_access(p_organization_id) then
    raise exception 'forbidden';
  end if;

  insert into public.crm_organization_storage (
    organization_id,
    storage_used_bytes,
    storage_limit_bytes,
    storage_enforcement
  )
  values (p_organization_id, 0, 1099511627776, 'track_only')
  on conflict (organization_id) do nothing;

  select storage_used_bytes, storage_limit_bytes, storage_enforcement
  into v_used, v_limit, v_enforcement
  from public.crm_organization_storage
  where organization_id = p_organization_id
  for update;

  if coalesce(v_enforcement, 'track_only') = 'block' and v_used + p_bytes > v_limit then
    raise exception 'STORAGE_LIMIT_EXCEEDED';
  end if;

  update public.crm_organization_storage
  set storage_used_bytes = v_used + p_bytes
  where organization_id = p_organization_id;
end;
$$;

create or replace function public.crm_release_organization_storage(
  p_organization_id uuid,
  p_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
begin
  if p_bytes is null or p_bytes <= 0 then
    raise exception 'invalid_bytes';
  end if;

  if auth.uid() is not null and not public.crm_user_has_org_access(p_organization_id) then
    raise exception 'forbidden';
  end if;

  insert into public.crm_organization_storage (
    organization_id,
    storage_used_bytes,
    storage_limit_bytes,
    storage_enforcement
  )
  values (p_organization_id, 0, 1099511627776, 'track_only')
  on conflict (organization_id) do nothing;

  select storage_used_bytes
  into v_used
  from public.crm_organization_storage
  where organization_id = p_organization_id
  for update;

  update public.crm_organization_storage
  set storage_used_bytes = greatest(0, v_used - p_bytes)
  where organization_id = p_organization_id;
end;
$$;

grant execute on function public.crm_reserve_organization_storage(uuid, bigint) to service_role;
grant execute on function public.crm_release_organization_storage(uuid, bigint) to service_role;
