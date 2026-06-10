-- Customer task portal: tokenized access for customers to complete assigned workflow tasks.

create table if not exists public.customer_task_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.platform_organizations (id) on delete cascade,
  project_id uuid not null
    references public.crm_projects (id) on delete cascade,
  workflow_task_id uuid not null
    references public.crm_workflow_tasks (id) on delete cascade,
  customer_email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  response_text text,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'revoked')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_task_requests is
  'Tokenized customer access to complete a single assigned workflow task without login.';

create unique index if not exists idx_customer_task_requests_token_hash
  on public.customer_task_requests (token_hash);

create index if not exists idx_customer_task_requests_workflow_task_id
  on public.customer_task_requests (workflow_task_id, created_at desc);

create index if not exists idx_customer_task_requests_active_task
  on public.customer_task_requests (workflow_task_id)
  where status = 'pending';

drop trigger if exists customer_task_requests_set_updated_at on public.customer_task_requests;
create trigger customer_task_requests_set_updated_at
  before update on public.customer_task_requests
  for each row
  execute function public.crm_set_updated_at();

alter table public.customer_task_requests enable row level security;

-- Access only via service-role server routes (no direct client policies).
