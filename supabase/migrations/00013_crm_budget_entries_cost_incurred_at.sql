-- Required cost-incurred timestamp for period-based Reports cost filtering.
-- Replaces nullable occurred_on (date) with cost_incurred_at (timestamptz).

alter table public.crm_project_budget_entries
  add column if not exists cost_incurred_at timestamptz;

comment on column public.crm_project_budget_entries.cost_incurred_at is
  'When the cost was incurred (labor performed, purchase, bill/receipt date). Required for reporting.';

-- Backfill: prefer legacy occurred_on at start-of-day UTC; otherwise created_at.
update public.crm_project_budget_entries
set cost_incurred_at = coalesce(
  occurred_on::timestamptz,
  created_at
)
where cost_incurred_at is null;

alter table public.crm_project_budget_entries
  alter column cost_incurred_at set not null;

alter table public.crm_project_budget_entries
  drop column if exists occurred_on;

create index if not exists idx_crm_project_budget_entries_cost_incurred_at
  on public.crm_project_budget_entries (organization_id, project_id, cost_incurred_at)
  where deleted_at is null;
