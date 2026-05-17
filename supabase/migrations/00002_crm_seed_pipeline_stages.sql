-- ============================================================================
-- BuildCore CRM — seed default pipeline stages (12-step)
-- Aligns with src/domain/crm/pipelineStage.ts DEFAULT_PIPELINE_STAGES
-- Global rows: organization_id IS NULL (suite-wide defaults)
-- ============================================================================

insert into public.crm_pipeline_stages (organization_id, slug, label, sort_order, is_active)
select v.organization_id, v.slug, v.label, v.sort_order, v.is_active
from (
  values
    (null::uuid, 'new-lead', 'New Lead', 1, true),
    (null::uuid, 'contacted', 'Contacted', 2, true),
    (null::uuid, 'inspection-scheduled', 'Inspection Scheduled', 3, true),
    (null::uuid, 'inspection-complete', 'Inspection Complete', 4, true),
    (null::uuid, 'estimate-sent', 'Estimate Sent', 5, true),
    (null::uuid, 'waiting-on-approval', 'Waiting on Approval', 6, true),
    (null::uuid, 'approved', 'Approved', 7, true),
    (null::uuid, 'scheduled', 'Scheduled', 8, true),
    (null::uuid, 'in-progress', 'In Progress', 9, true),
    (null::uuid, 'completed', 'Completed', 10, true),
    (null::uuid, 'invoiced', 'Invoiced', 11, true),
    (null::uuid, 'paid', 'Paid', 12, true)
) as v (organization_id, slug, label, sort_order, is_active)
where not exists (
  select 1
  from public.crm_pipeline_stages s
  where s.organization_id is null
    and s.slug = v.slug
);
