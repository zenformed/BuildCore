-- ============================================================================
-- BuildCore CRM — scoped pipeline stages (project vs subproject)
-- ============================================================================

alter table public.crm_pipeline_stages
  add column if not exists stage_scope text not null default 'project';

alter table public.crm_pipeline_stages
  drop constraint if exists crm_pipeline_stages_stage_scope_check;

alter table public.crm_pipeline_stages
  add constraint crm_pipeline_stages_stage_scope_check
  check (stage_scope in ('project', 'subproject'));

comment on column public.crm_pipeline_stages.stage_scope is
  'Whether this stage belongs to parent project (project) or subproject (subproject) workflow catalogs.';

-- Replace slug uniqueness with scope-aware indexes.
drop index if exists crm_pipeline_stages_global_slug_uidx;
drop index if exists crm_pipeline_stages_org_slug_uidx;
drop index if exists idx_crm_pipeline_stages_org_active_sort;

create unique index if not exists crm_pipeline_stages_global_scope_slug_uidx
  on public.crm_pipeline_stages (stage_scope, slug)
  where organization_id is null;

create unique index if not exists crm_pipeline_stages_org_scope_slug_uidx
  on public.crm_pipeline_stages (organization_id, stage_scope, slug)
  where organization_id is not null;

create index if not exists idx_crm_pipeline_stages_org_scope_active_sort
  on public.crm_pipeline_stages (organization_id, stage_scope, is_active, sort_order);

-- Global template rows: duplicate project defaults into subproject scope.
insert into public.crm_pipeline_stages (
  organization_id,
  stage_scope,
  slug,
  label,
  sort_order,
  is_active
)
select
  g.organization_id,
  'subproject',
  g.slug,
  g.label,
  g.sort_order,
  g.is_active
from public.crm_pipeline_stages g
where g.organization_id is null
  and g.stage_scope = 'project'
  and not exists (
    select 1
    from public.crm_pipeline_stages existing
    where existing.organization_id is null
      and existing.stage_scope = 'subproject'
      and existing.slug = g.slug
  );

-- Org catalogs: duplicate existing project-scope rows into subproject scope.
insert into public.crm_pipeline_stages (
  organization_id,
  stage_scope,
  slug,
  label,
  sort_order,
  is_active
)
select
  p.organization_id,
  'subproject',
  p.slug,
  p.label,
  p.sort_order,
  p.is_active
from public.crm_pipeline_stages p
where p.organization_id is not null
  and p.stage_scope = 'project'
  and not exists (
    select 1
    from public.crm_pipeline_stages existing
    where existing.organization_id = p.organization_id
      and existing.stage_scope = 'subproject'
      and existing.slug = p.slug
  );

-- Ensure Complete terminal stage exists in both scopes for global templates.
insert into public.crm_pipeline_stages (organization_id, stage_scope, slug, label, sort_order, is_active)
select null, scope.scope, 'complete', 'Complete', 13, true
from (values ('project'), ('subproject')) as scope(scope)
where not exists (
  select 1
  from public.crm_pipeline_stages existing
  where existing.organization_id is null
    and existing.stage_scope = scope.scope
    and existing.slug = 'complete'
);

-- Ensure Complete terminal stage exists in both scopes for each org catalog.
insert into public.crm_pipeline_stages (organization_id, stage_scope, slug, label, sort_order, is_active)
select
  org.organization_id,
  org.stage_scope,
  'complete',
  'Complete',
  org.max_sort_order + 1,
  true
from (
  select organization_id, stage_scope, max(sort_order) as max_sort_order
  from public.crm_pipeline_stages
  where organization_id is not null
  group by organization_id, stage_scope
) org
where not exists (
  select 1
  from public.crm_pipeline_stages existing
  where existing.organization_id = org.organization_id
    and existing.stage_scope = org.stage_scope
    and existing.slug = 'complete'
);

-- Normalize sort order per org + scope so Complete is always last.
with ranked as (
  select
    id,
    row_number() over (
      partition by organization_id, stage_scope
      order by
        case when slug = 'complete' then 1 else 0 end,
        sort_order,
        label
    ) as next_sort_order
  from public.crm_pipeline_stages
  where organization_id is not null
    and is_active = true
)
update public.crm_pipeline_stages stage
set sort_order = ranked.next_sort_order
from ranked
where stage.id = ranked.id;
