-- Backfill crm_organization_storage from ready crm_documents metadata.
-- Safe to re-run: never lowers an existing counter; raises rows missing or under-counted.

insert into public.crm_organization_storage (
  organization_id,
  storage_used_bytes,
  storage_limit_bytes,
  storage_enforcement
)
select
  d.organization_id,
  coalesce(sum(d.file_size_bytes), 0)::bigint,
  1099511627776,
  'track_only'
from public.crm_documents d
where d.deleted_at is null
  and d.upload_status = 'ready'
  and d.file_size_bytes > 0
group by d.organization_id
on conflict (organization_id) do update
set storage_used_bytes = greatest(
  coalesce(public.crm_organization_storage.storage_used_bytes, 0),
  excluded.storage_used_bytes
);
