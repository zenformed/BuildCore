/**
 * After a successful notify-assigned email to an org member, ensure the matching
 * workflow_task.assigned in-app row exists (idempotent with the auto-assign producer).
 * Customer assignees cannot receive platform in-app notifications.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';
import { dispatchWorkflowTaskAssignedInAppNotification } from '@/infrastructure/crm/server/dispatchWorkflowTaskAssignedInAppNotification';

export async function dispatchWorkflowTaskAssignedNotifyEmailInApp(input: {
  readonly supabase: SupabaseClient;
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly taskId: string;
}): Promise<void> {
  try {
    const { data, error } = await input.supabase
      .from('crm_workflow_tasks')
      .select('id, title, project_id, assigned_member_id, assigned_contact_id')
      .eq('organization_id', input.organizationId)
      .eq('id', input.taskId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data == null) return;

    const row = data as {
      id: string;
      title: string;
      project_id: string;
      assigned_member_id: string | null;
      assigned_contact_id: string | null;
    };

    const memberId = row.assigned_member_id?.trim() || null;
    if (!memberId || isWorkflowTaskContactAssigneeId(memberId)) return;
    if (row.assigned_contact_id != null && !memberId) return;

    await dispatchWorkflowTaskAssignedInAppNotification({
      supabase: input.supabase,
      accessToken: input.accessToken,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      projectId: row.project_id,
      taskId: row.id,
      taskTitle: row.title,
      // Treat as a fresh assignment signal so the gate allows create; Core
      // idempotency key still uses assigned_at so auto-assign + email share one row.
      previousAssignedMemberId: null,
      nextAssignedMemberId: memberId,
    });
  } catch (err: unknown) {
    console.info(
      JSON.stringify({
        tag: 'buildcore_workflow_task_assigned_notification',
        event: 'notify_email_in_app_exception',
        taskId: input.taskId,
        organizationId: input.organizationId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
