-- Budget entry document attachments (parallel to workflow task documents).

alter table public.crm_documents
  add column if not exists budget_entry_id uuid references public.crm_project_budget_entries (id) on delete cascade;

alter table public.crm_documents
  alter column workflow_task_id drop not null;

alter table public.crm_documents
  drop constraint if exists crm_documents_task_or_budget_chk;

alter table public.crm_documents
  add constraint crm_documents_task_or_budget_chk
  check (
    (workflow_task_id is not null and budget_entry_id is null)
    or (workflow_task_id is null and budget_entry_id is not null)
  );

create index if not exists idx_crm_documents_budget_entry_id
  on public.crm_documents (budget_entry_id)
  where deleted_at is null and budget_entry_id is not null;
