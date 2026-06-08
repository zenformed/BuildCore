-- Subprojects: child projects linked to a parent row in crm_projects.

alter table public.crm_projects
  add column if not exists parent_project_id uuid null;

alter table public.crm_projects
  drop constraint if exists crm_projects_parent_project_id_fkey;

alter table public.crm_projects
  add constraint crm_projects_parent_project_id_fkey
  foreign key (parent_project_id)
  references public.crm_projects (id)
  on delete set null;

create index if not exists crm_projects_parent_project_id_idx
  on public.crm_projects (parent_project_id)
  where parent_project_id is not null;
