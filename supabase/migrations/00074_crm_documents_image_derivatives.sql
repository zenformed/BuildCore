-- ============================================================================
-- Phase: CRM document image derivatives (thumbnail + preview)
--
-- Additive columns for durable WebP derivatives generated after upload finalize.
-- Does not modify originals. Signed URLs are never stored — only storage keys.
-- ============================================================================

alter table public.crm_documents
  add column if not exists image_width integer,
  add column if not exists image_height integer,
  add column if not exists thumbnail_storage_key text,
  add column if not exists preview_storage_key text,
  add column if not exists derivative_status text,
  add column if not exists derivative_error text,
  add column if not exists derivative_version integer not null default 0,
  add column if not exists derivatives_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_documents_derivative_status_check'
  ) then
    alter table public.crm_documents
      add constraint crm_documents_derivative_status_check
      check (
        derivative_status is null
        or derivative_status in ('pending', 'ready', 'failed', 'skipped')
      );
  end if;
end $$;

comment on column public.crm_documents.image_width is
  'Original pixel width after EXIF orientation (images only).';
comment on column public.crm_documents.image_height is
  'Original pixel height after EXIF orientation (images only).';
comment on column public.crm_documents.thumbnail_storage_key is
  'Durable Storage key for ~320px WebP thumbnail derivative.';
comment on column public.crm_documents.preview_storage_key is
  'Durable Storage key for ~1600px WebP preview derivative.';
comment on column public.crm_documents.derivative_status is
  'pending | ready | failed | skipped (non-images). Null for legacy rows until backfill.';
comment on column public.crm_documents.derivative_error is
  'Last derivative generation error (retryable).';
comment on column public.crm_documents.derivative_version is
  'Derivative pipeline version written into storage keys (v1, …).';
comment on column public.crm_documents.derivatives_updated_at is
  'When derivative_status / keys were last updated.';

-- Backfill candidate scan: ready images missing derivatives.
create index if not exists idx_crm_documents_image_derivative_backfill
  on public.crm_documents (organization_id, created_at asc, id asc)
  where deleted_at is null
    and upload_status = 'ready'
    and mime_type like 'image/%'
    and (
      derivative_status is null
      or derivative_status in ('pending', 'failed')
      or thumbnail_storage_key is null
      or preview_storage_key is null
    );
