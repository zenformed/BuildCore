-- ============================================================================
-- Visible payment table custom column slots (0–2 per organization).
-- Payment scope only; independent from workflow task table columns.
-- ============================================================================

create table if not exists public.buildcore_payment_table_columns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  position smallint not null,
  field_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildcore_payment_table_columns_org_position_unique unique (organization_id, position),
  constraint buildcore_payment_table_columns_position_check check (position in (1, 2)),
  constraint buildcore_payment_table_columns_field_key_format check (field_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

comment on table public.buildcore_payment_table_columns is
  'Organization-configured visible custom columns for the payments table (max 2 slots).';

create index if not exists idx_buildcore_payment_table_columns_organization_id
  on public.buildcore_payment_table_columns (organization_id);

drop trigger if exists buildcore_payment_table_columns_set_updated_at
  on public.buildcore_payment_table_columns;
create trigger buildcore_payment_table_columns_set_updated_at
  before update on public.buildcore_payment_table_columns
  for each row
  execute function public.crm_set_updated_at();

alter table public.buildcore_payment_table_columns enable row level security;

create policy buildcore_payment_table_columns_select_org
  on public.buildcore_payment_table_columns for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy buildcore_payment_table_columns_insert_org
  on public.buildcore_payment_table_columns for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_payment_table_columns_update_org
  on public.buildcore_payment_table_columns for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_payment_table_columns_delete_org
  on public.buildcore_payment_table_columns for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
