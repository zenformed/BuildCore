-- Manual inspection queries after applying 00070_crm_projects_project_status.sql.
-- Do not run as a migration — use for post-deploy verification.

-- Total rows by new project_status (all rows)
select project_status, count(*) as row_count
from public.crm_projects
group by project_status
order by project_status;

-- Non-archived totals by status
select project_status, count(*) as row_count
from public.crm_projects
where archived_at is null
group by project_status
order by project_status;

-- Parents vs children by status (non-archived)
select
  case when parent_project_id is null then 'parent' else 'subproject' end as entity_kind,
  project_status,
  count(*) as row_count
from public.crm_projects
where archived_at is null
group by 1, 2
order by 1, 2;

-- Legacy inactive → lost / cancelled
select
  count(*) filter (where subproject_status = 'inactive') as legacy_inactive,
  count(*) filter (
    where subproject_status = 'inactive' and inactive_reason = 'project_canceled'
  ) as legacy_inactive_project_canceled,
  count(*) filter (
    where subproject_status = 'inactive' and project_status = 'cancelled'
  ) as mapped_cancelled,
  count(*) filter (
    where subproject_status = 'inactive' and project_status = 'lost'
  ) as mapped_lost,
  count(*) filter (
    where subproject_status = 'inactive'
      and project_status not in ('lost', 'cancelled')
  ) as inactive_mismatched
from public.crm_projects;

-- completed_at / completed status → completed
select
  count(*) filter (where completed_at is not null) as has_completed_at,
  count(*) filter (where subproject_status = 'completed') as legacy_completed_status,
  count(*) filter (where project_status = 'completed') as mapped_completed,
  count(*) filter (
    where (completed_at is not null or subproject_status = 'completed')
      and project_status is distinct from 'completed'
      and subproject_status is distinct from 'inactive'
  ) as completed_mismatched_non_inactive
from public.crm_projects;

-- No unmapped non-archived records
select count(*) as unmapped_non_archived
from public.crm_projects
where archived_at is null
  and project_status is null;

-- Loss reason compatibility (lost rows)
select loss_reason, count(*) as row_count
from public.crm_projects
where project_status = 'lost'
group by loss_reason
order by row_count desc;

-- Anomalies: inactive with null / invalid reason (preserved as other + legacy marker)
select
  id,
  slug,
  parent_project_id,
  inactive_reason,
  inactive_reason_custom,
  loss_reason,
  loss_reason_other,
  project_status
from public.crm_projects
where project_status = 'lost'
  and (
    loss_reason_other like '[legacy]%'
    or inactive_reason is null
    or inactive_reason not in (
      'chose_competitor',
      'price',
      'no_response',
      'project_canceled',
      'outside_service_area',
      'not_qualified',
      'duplicate',
      'dead_lead',
      'other'
    )
  )
order by updated_at desc
limit 200;

-- Anomalies: cancelled with leftover custom text (not stored on loss_* by design)
select
  id,
  slug,
  inactive_reason,
  inactive_reason_custom
from public.crm_projects
where project_status = 'cancelled'
  and nullif(trim(inactive_reason_custom), '') is not null
limit 200;

-- Dual-read drift check (should be 0 right after backfill; may rise until dual-write is complete)
select count(*) as status_vs_legacy_drift
from public.crm_projects
where archived_at is null
  and (
    (subproject_status = 'inactive' and inactive_reason = 'project_canceled' and project_status is distinct from 'cancelled')
    or (subproject_status = 'inactive' and inactive_reason is distinct from 'project_canceled' and project_status is distinct from 'lost')
    or (
      subproject_status is distinct from 'inactive'
      and (subproject_status = 'completed' or completed_at is not null)
      and project_status is distinct from 'completed'
    )
    or (
      subproject_status in ('urgent', 'normal')
      and completed_at is null
      and project_status is distinct from 'active'
    )
  );
