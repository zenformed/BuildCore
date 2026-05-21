-- Payment milestone timing on workflow tasks (amount_cents IS NOT NULL).
alter table public.crm_workflow_tasks
  add column if not exists invoiced_at timestamptz,
  add column if not exists paid_at timestamptz;

comment on column public.crm_workflow_tasks.invoiced_at is
  'When set on a payment milestone row, amount counts toward invoiced revenue reporting.';

comment on column public.crm_workflow_tasks.paid_at is
  'When set on a payment milestone row, amount counts toward collected/paid revenue reporting.';

-- Backfill paid_at from completed_at only where we have a trustworthy completion timestamp.
update public.crm_workflow_tasks
set paid_at = completed_at
where amount_cents is not null
  and status = 'done'
  and paid_at is null
  and completed_at is not null;
