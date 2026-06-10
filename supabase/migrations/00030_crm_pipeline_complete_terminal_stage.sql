-- Terminal Complete stage + decouple payment milestones from the paid pipeline slug.

-- Global default catalog: add Complete terminal stage.
insert into public.crm_pipeline_stages (organization_id, slug, label, sort_order, is_active)
select null, 'complete', 'Complete', 13, true
where not exists (
  select 1
  from public.crm_pipeline_stages
  where organization_id is null
    and slug = 'complete'
);

-- Org catalogs: add Complete at the end when missing.
insert into public.crm_pipeline_stages (organization_id, slug, label, sort_order, is_active)
select
  org.organization_id,
  'complete',
  'Complete',
  org.max_sort_order + 1,
  true
from (
  select organization_id, max(sort_order) as max_sort_order
  from public.crm_pipeline_stages
  where organization_id is not null
    and is_active = true
  group by organization_id
) org
where not exists (
  select 1
  from public.crm_pipeline_stages existing
  where existing.organization_id = org.organization_id
    and existing.slug = 'complete'
);

-- Payment milestones use internal bucket slug (not a pipeline stage).
update public.crm_workflow_tasks
set stage_slug = 'payments'
where amount_cents is not null
  and stage_slug = 'paid';

-- Completed projects on legacy Paid stage move to Complete.
update public.crm_projects
set current_stage_slug = 'complete'
where completed_at is not null
  and current_stage_slug = 'paid';

-- Normalize org catalogs so Complete is always last.
with ranked as (
  select
    id,
    organization_id,
    row_number() over (
      partition by organization_id
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
