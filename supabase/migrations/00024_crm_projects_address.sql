-- Optional physical address on CRM projects.

alter table public.crm_projects
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text;

comment on column public.crm_projects.address_line_1 is
  'Optional project site address line 1.';
comment on column public.crm_projects.address_line_2 is
  'Optional project site address line 2.';
comment on column public.crm_projects.city is
  'Optional project site city.';
comment on column public.crm_projects.state is
  'Optional US state code for project site address.';
comment on column public.crm_projects.postal_code is
  'Optional project site postal / ZIP code.';
