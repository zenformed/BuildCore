-- =============================================================================
-- CRM record identity values (duplicate detection + future exact-value search)
-- Additive lookup index. Does not replace crm_projects / contacts / custom fields.
-- Status, stage, and archive state are NOT stored here — load live from crm_projects.
-- =============================================================================

create table if not exists public.crm_record_identity_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  record_id uuid not null references public.crm_projects (id) on delete cascade,
  record_type text not null
    check (record_type in ('project', 'subproject')),
  value_type text not null
    check (value_type in ('name', 'email', 'phone', 'address', 'identity_text')),
  normalized_value text not null
    check (char_length(normalized_value) > 0),
  source_kind text not null
    check (source_kind in (
      'project_name',
      'contact_name',
      'contact_email',
      'contact_phone',
      'project_address',
      'name_parts',
      'custom_field'
    )),
  source_field_key text null,
  source_field_label text null,
  source_value_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per record + type + normalized value. Multiple sources collapse to
  -- a single canonical source chosen during extraction (see extractIdentityValues).
  constraint crm_record_identity_values_record_type_value_unique
    unique (record_id, value_type, normalized_value)
);

comment on table public.crm_record_identity_values is
  'Organization-scoped normalized identity lookup for CRM projects/subprojects (dedupe + future exact-value search).';

comment on column public.crm_record_identity_values.record_id is
  'crm_projects.id for both parent projects and subprojects.';

comment on column public.crm_record_identity_values.value_type is
  'Semantic identity class of normalized_value (independent of storage source).';

comment on column public.crm_record_identity_values.source_kind is
  'Canonical source selected when multiple fields produced the same normalized value.';

comment on column public.crm_record_identity_values.source_value_id is
  'Optional buildcore_project_custom_field_values.id when source_kind = custom_field.';

-- Candidate / exact-value lookup
create index if not exists idx_crm_record_identity_values_org_type_value
  on public.crm_record_identity_values (organization_id, value_type, normalized_value);

-- Delete-and-rebuild per record
create index if not exists idx_crm_record_identity_values_record_id
  on public.crm_record_identity_values (record_id);

-- Org cleanup / backfill scoping
create index if not exists idx_crm_record_identity_values_organization_id
  on public.crm_record_identity_values (organization_id);

drop trigger if exists crm_record_identity_values_set_updated_at
  on public.crm_record_identity_values;
create trigger crm_record_identity_values_set_updated_at
  before update on public.crm_record_identity_values
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_record_identity_values enable row level security;

create policy crm_record_identity_values_select_org
  on public.crm_record_identity_values for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_record_identity_values_insert_org
  on public.crm_record_identity_values for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_record_identity_values_update_org
  on public.crm_record_identity_values for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_record_identity_values_delete_org
  on public.crm_record_identity_values for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
