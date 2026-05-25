-- Workflow tasks can be assigned to the project primary contact (customer), not only org members.
alter table public.crm_workflow_tasks
  add column if not exists assigned_contact_id uuid references public.crm_contacts (id) on delete set null;

comment on column public.crm_workflow_tasks.assigned_contact_id is
  'When set, task is assigned to this CRM contact; assigned_member_id must be null.';

alter table public.crm_workflow_tasks
  drop constraint if exists crm_workflow_tasks_assignee_exclusive;

alter table public.crm_workflow_tasks
  add constraint crm_workflow_tasks_assignee_exclusive check (
    assigned_member_id is null or assigned_contact_id is null
  );

create index if not exists idx_crm_workflow_tasks_assigned_contact_id
  on public.crm_workflow_tasks (assigned_contact_id)
  where assigned_contact_id is not null;
