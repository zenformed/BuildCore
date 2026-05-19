alter table public.crm_project_budget_entries
  add column if not exists documents_required boolean not null default true;
