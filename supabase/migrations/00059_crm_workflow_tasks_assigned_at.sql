-- Durable assignment timestamp for workflow_task.assigned notification idempotency.
-- Set when assigned_member_id becomes a non-null org member; cleared on unassign / customer assignee.

ALTER TABLE public.crm_workflow_tasks
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

COMMENT ON COLUMN public.crm_workflow_tasks.assigned_at IS
  'When the task was last assigned to an org member (auth user). Used for notification idempotency.';
