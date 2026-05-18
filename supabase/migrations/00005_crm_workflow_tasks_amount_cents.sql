-- Payment milestone amount on workflow tasks (nullable = standard ops task).
alter table public.crm_workflow_tasks
  add column if not exists amount_cents bigint null
  check (amount_cents is null or amount_cents >= 0);

comment on column public.crm_workflow_tasks.amount_cents is
  'When set, task is a payment milestone; project balance derives from unpaid payment tasks.';
