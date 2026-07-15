/**
 * Post-persist dispatcher for workflow_task.assigned in-app notifications.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';
import {
  loadWorkflowTaskAssignmentProjectContext,
  notifyWorkflowTaskAssignedInApp,
} from '@/infrastructure/crm/server/notifyWorkflowTaskAssignedInApp';

function memberAssigneeId(assigneeId: string | null | undefined): string | null {
  if (assigneeId == null || !assigneeId.trim()) return null;
  if (isWorkflowTaskContactAssigneeId(assigneeId)) return null;
  return assigneeId.trim();
}

export async function dispatchWorkflowTaskAssignedInAppNotification(input: {
  readonly supabase: SupabaseClient;
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly projectId: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly previousAssignedMemberId: string | null;
  readonly nextAssignedMemberId: string | null;
}): Promise<void> {
  const previousAssignedMemberId = memberAssigneeId(input.previousAssignedMemberId);
  const nextAssignedMemberId = memberAssigneeId(input.nextAssignedMemberId);

  try {
    const projectContext = await loadWorkflowTaskAssignmentProjectContext(
      input.supabase,
      input.organizationId,
      input.projectId
    );
    if (projectContext == null) return;

    const { data } = await input.supabase
      .from('crm_workflow_tasks')
      .select('assigned_at, assigned_member_id')
      .eq('organization_id', input.organizationId)
      .eq('id', input.taskId)
      .maybeSingle();

    const assignedAt =
      data != null && typeof (data as { assigned_at?: unknown }).assigned_at === 'string'
        ? (data as { assigned_at: string }).assigned_at
        : null;
    const persistedMemberId =
      data != null &&
      typeof (data as { assigned_member_id?: unknown }).assigned_member_id === 'string'
        ? (data as { assigned_member_id: string }).assigned_member_id
        : nextAssignedMemberId;

    await notifyWorkflowTaskAssignedInApp({
      accessToken: input.accessToken,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousAssignedMemberId,
      nextAssignedMemberId: persistedMemberId,
      assignedAt,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      projectContext,
      supabase: input.supabase,
    });
  } catch (err: unknown) {
    console.info(
      JSON.stringify({
        tag: 'buildcore_workflow_task_assigned_notification',
        event: 'dispatch_exception',
        taskId: input.taskId,
        organizationId: input.organizationId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
