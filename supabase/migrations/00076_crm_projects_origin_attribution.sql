-- ============================================================================
-- Stage 3: immutable Project origin attribution
--
-- Legacy and unauthenticated external-capture records deliberately remain null.
-- New authenticated Data API inserts are stamped from auth.uid(); trusted server
-- create paths supply an active organization member and never control the time.
-- ============================================================================

alter table public.crm_projects
  add column if not exists originated_by_member_id uuid references auth.users (id) on delete restrict,
  add column if not exists originated_at timestamptz;

alter table public.crm_projects
  drop constraint if exists crm_projects_origin_attribution_pair;

alter table public.crm_projects
  add constraint crm_projects_origin_attribution_pair check (
    (originated_by_member_id is null and originated_at is null)
    or (originated_by_member_id is not null and originated_at is not null)
  );

create index if not exists idx_crm_projects_org_originated_by
  on public.crm_projects (organization_id, originated_by_member_id)
  where originated_by_member_id is not null;

create or replace function public.crm_projects_enforce_origin_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- An authenticated Data API caller can never nominate another originator.
    if auth.uid() is not null then
      new.originated_by_member_id := auth.uid();
    end if;

    -- Null is intentional for legacy-compatible, unauthenticated capture.
    if new.originated_by_member_id is null then
      if new.originated_at is not null then
        raise exception 'crm_projects origin timestamp requires an originator';
      end if;
      return new;
    end if;

    if not exists (
      select 1
      from public.platform_organization_members member
      where member.organization_id = new.organization_id
        and member.user_id = new.originated_by_member_id
        and member.membership_status = 'active'
    ) then
      raise exception 'crm_projects originator must be an active member of the project organization';
    end if;

    -- The database, rather than a client or service, owns the attribution time.
    new.originated_at := now();
    return new;
  end if;

  if new.originated_by_member_id is distinct from old.originated_by_member_id
     or new.originated_at is distinct from old.originated_at then
    raise exception 'crm_projects origin attribution is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.crm_projects_enforce_origin_attribution() from public;

drop trigger if exists crm_projects_enforce_origin_attribution on public.crm_projects;
create trigger crm_projects_enforce_origin_attribution
before insert or update on public.crm_projects
for each row execute function public.crm_projects_enforce_origin_attribution();

comment on column public.crm_projects.originated_by_member_id is
  'Immutable authenticated Project originator. Null for legacy or unauthenticated external-capture records.';
comment on column public.crm_projects.originated_at is
  'Database-stamped immutable Project origin time. Null when originator is unknown.';
