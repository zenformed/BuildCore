-- ============================================================================
-- BuildCore organization-specific field display labels (UI-only; not DB fields).
-- ============================================================================

create table if not exists public.buildcore_field_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  field_key text not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_field_labels_org_field_key_unique unique (organization_id, field_key),
  constraint buildcore_field_labels_label_nonempty check (char_length(trim(label)) > 0),
  constraint buildcore_field_labels_label_max_length check (char_length(trim(label)) <= 40)
);

comment on table public.buildcore_field_labels is
  'Per-organization display labels for stable BuildCore field keys. Does not rename DB/API columns.';

comment on column public.buildcore_field_labels.field_key is
  'Stable semantic identity for UI/settings/imports (e.g. workflow_task.task).';

comment on column public.buildcore_field_labels.label is
  'Organization-specific display label override (max 40 characters).';

create index if not exists idx_buildcore_field_labels_organization_id
  on public.buildcore_field_labels (organization_id);

drop trigger if exists buildcore_field_labels_set_updated_at on public.buildcore_field_labels;
create trigger buildcore_field_labels_set_updated_at
  before update on public.buildcore_field_labels
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_field_labels enable row level security;

create policy buildcore_field_labels_select_org
  on public.buildcore_field_labels for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_field_labels_insert_org
  on public.buildcore_field_labels for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_field_labels_update_org
  on public.buildcore_field_labels for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
