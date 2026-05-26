-- ============================================================================
-- BuildCore — optional single default project template per organization
-- ============================================================================

alter table public.buildcore_project_templates
  add column if not exists is_default boolean not null default false;

comment on column public.buildcore_project_templates.is_default is
  'When true, this template is auto-applied to new project drafts. At most one per organization.';

create unique index if not exists idx_buildcore_project_templates_one_default_per_org
  on public.buildcore_project_templates (organization_id)
  where is_default = true;
