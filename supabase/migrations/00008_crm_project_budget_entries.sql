-- Project budget / cost entries (P&L), separate from payment milestones.

create table if not exists public.crm_project_budget_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  project_id uuid not null references public.crm_projects (id) on delete cascade,
  item_name text not null,
  category text not null check (
    category in (
      'labor',
      'materials',
      'equipment',
      'subcontractors',
      'permits',
      'travel',
      'lodging',
      'per_diem',
      'fuel',
      'dump_disposal',
      'rental_fees',
      'insurance',
      'office_admin',
      'other'
    )
  ),
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  budget_cents bigint not null default 0 check (budget_cents >= 0),
  notes text,
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  occurred_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.crm_project_budget_entries is
  'Per-project budget line items for cost tracking and P&L (not payment milestones).';

create index if not exists idx_crm_project_budget_entries_project_id
  on public.crm_project_budget_entries (project_id)
  where deleted_at is null;

create index if not exists idx_crm_project_budget_entries_organization_id
  on public.crm_project_budget_entries (organization_id)
  where deleted_at is null;

create index if not exists idx_crm_project_budget_entries_category
  on public.crm_project_budget_entries (organization_id, project_id, category)
  where deleted_at is null;

drop trigger if exists crm_project_budget_entries_set_updated_at on public.crm_project_budget_entries;
create trigger crm_project_budget_entries_set_updated_at
  before update on public.crm_project_budget_entries
  for each row
  execute function public.crm_set_updated_at();

alter table public.crm_project_budget_entries enable row level security;

create policy crm_project_budget_entries_select_org
  on public.crm_project_budget_entries for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_project_budget_entries_insert_org
  on public.crm_project_budget_entries for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_project_budget_entries_update_org
  on public.crm_project_budget_entries for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_project_budget_entries_delete_org
  on public.crm_project_budget_entries for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));
