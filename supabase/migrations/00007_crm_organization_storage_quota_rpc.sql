-- ============================================================================
-- BuildCore CRM — server-authoritative organization document storage quota
--
-- Replaces direct JWT updates to storage_used_bytes (bypassable via RLS).
-- Authenticated org members may call reserve/release RPCs only.
-- ============================================================================

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
begin
  if p_bytes is null or p_bytes <= 0 then
    raise exception 'invalid_bytes';
  end if;

  if not public.crm_user_has_org_access(p_organization_id) then
    raise exception 'forbidden';
  end if;

  insert into public.crm_organization_storage (organization_id, storage_used_bytes, storage_limit_bytes)
  values (p_organization_id, 0, 10737418240)
  on conflict (organization_id) do nothing;

  select storage_used_bytes, storage_limit_bytes
  into v_used, v_limit
  from public.crm_organization_storage
  where organization_id = p_organization_id
  for update;

  if v_used + p_bytes > v_limit then
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

  if not public.crm_user_has_org_access(p_organization_id) then
    raise exception 'forbidden';
  end if;

  insert into public.crm_organization_storage (organization_id, storage_used_bytes, storage_limit_bytes)
  values (p_organization_id, 0, 10737418240)
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

revoke all on function public.crm_reserve_organization_storage(uuid, bigint) from public;
revoke all on function public.crm_release_organization_storage(uuid, bigint) from public;
grant execute on function public.crm_reserve_organization_storage(uuid, bigint) to authenticated;
grant execute on function public.crm_release_organization_storage(uuid, bigint) to authenticated;

comment on function public.crm_reserve_organization_storage is
  'Atomically checks org document quota and increments storage_used_bytes.';
comment on function public.crm_release_organization_storage is
  'Decrements storage_used_bytes after document delete or failed upload rollback.';

-- Members may read quota; they must not mutate used bytes directly.
drop policy if exists crm_organization_storage_update_org on public.crm_organization_storage;
drop policy if exists crm_organization_storage_insert_org on public.crm_organization_storage;
