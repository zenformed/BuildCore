-- ============================================================================
-- Add rejected to crm_workflow_tasks.status allowed values.
-- ============================================================================

alter table public.crm_workflow_tasks
  drop constraint if exists crm_workflow_tasks_status_check;

alter table public.crm_workflow_tasks
  add constraint crm_workflow_tasks_status_check
  check (status in (
    'pending',
    'in_progress',
    'blocked',
    'skipped',
    'request_review',
    'rejected',
    'done'
  ));
