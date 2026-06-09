-- ============================================================================
-- BuildCore — template scope: project vs subproject
-- ============================================================================

alter table public.buildcore_project_templates
  add column if not exists template_scope text not null default 'project';

alter table public.buildcore_project_templates
  drop constraint if exists buildcore_project_templates_template_scope_check;

alter table public.buildcore_project_templates
  add constraint buildcore_project_templates_template_scope_check
  check (template_scope in ('project', 'subproject'));

comment on column public.buildcore_project_templates.template_scope is
  'Whether this template applies to root projects (project) or child subprojects (subproject).';

-- Existing rows default to project scope via column default.
update public.buildcore_project_templates
set template_scope = 'project'
where template_scope is null;

-- One default template per org per scope.
drop index if exists idx_buildcore_project_templates_one_default_per_org;

create unique index if not exists idx_buildcore_project_templates_one_default_per_org_scope
  on public.buildcore_project_templates (organization_id, template_scope)
  where is_default = true;

create index if not exists idx_buildcore_project_templates_org_scope_created_at
  on public.buildcore_project_templates (organization_id, template_scope, created_at desc);
