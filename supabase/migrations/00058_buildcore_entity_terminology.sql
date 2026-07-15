-- ============================================================================
-- BuildCore organization-specific entity display terminology (UI-only).
-- Keys: project | subproject. Plurals are derived in application code.
-- ============================================================================

create table if not exists public.buildcore_entity_terminology (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  entity_key text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_entity_terminology_org_entity_key_unique unique (organization_id, entity_key),
  constraint buildcore_entity_terminology_entity_key_check check (entity_key in ('project', 'subproject')),
  constraint buildcore_entity_terminology_display_name_nonempty check (char_length(trim(display_name)) > 0),
  constraint buildcore_entity_terminology_display_name_max_length check (char_length(trim(display_name)) <= 40)
);

comment on table public.buildcore_entity_terminology is
  'Per-organization display names for Project / Subproject entity words. Does not rename DB/API/routes.';

comment on column public.buildcore_entity_terminology.entity_key is
  'Stable key: project | subproject. Plural forms are derived in the app.';

comment on column public.buildcore_entity_terminology.display_name is
  'Organization-specific singular display name (max 40 characters).';

create index if not exists idx_buildcore_entity_terminology_organization_id
  on public.buildcore_entity_terminology (organization_id);

drop trigger if exists buildcore_entity_terminology_set_updated_at on public.buildcore_entity_terminology;
create trigger buildcore_entity_terminology_set_updated_at
  before update on public.buildcore_entity_terminology
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_entity_terminology enable row level security;

create policy buildcore_entity_terminology_select_org
  on public.buildcore_entity_terminology for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_entity_terminology_insert_org
  on public.buildcore_entity_terminology for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_entity_terminology_update_org
  on public.buildcore_entity_terminology for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
