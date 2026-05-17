-- Per-task flag: whether documents are required before the task can be considered complete.
alter table public.crm_workflow_tasks
  add column if not exists documents_required boolean not null default true;

comment on column public.crm_workflow_tasks.documents_required is
  'When false, the project detail documents column shows N/A for this task.';
