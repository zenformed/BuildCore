-- Permanent public lead token for each CRM project (QR codes, future /lead/{token} portal).
-- Safe to re-run: skips steps already applied.

alter table public.crm_projects
  add column if not exists lead_token text null;

update public.crm_projects
set lead_token = gen_random_uuid()::text
where lead_token is null;

alter table public.crm_projects
  alter column lead_token set default gen_random_uuid()::text;

alter table public.crm_projects
  alter column lead_token set not null;

create unique index if not exists crm_projects_lead_token_unique
  on public.crm_projects (lead_token);

comment on column public.crm_projects.lead_token is
  'Permanent random token for public lead URLs (/lead/{lead_token}). Never derived from slug or id.';
