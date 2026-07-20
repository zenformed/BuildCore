/**
 * Post-persist dispatcher for status-transition in-app notifications
 * (needs_approval + rejected + completed). Email is separate for approval/rejected only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';
import {
  loadProjectAssigneeUserId,
  loadWorkflowTaskAssignmentProjectContext,
  notifyWorkflowTaskNeedsApprovalInApp,
} from '@/infrastructure/crm/server/notifyWorkflowTaskNeedsApprovalInApp';
import { notifyWorkflowTaskRejectedInApp } from '@/infrastructure/crm/server/notifyWorkflowTaskRejectedInApp';
import { notifyWorkflowTaskCompletedInApp } from '@/infrastructure/crm/server/notifyWorkflowTaskCompletedInApp';

function memberAssigneeId(assigneeId: string | null | undefined): string | null {
  if (assigneeId == null || !assigneeId.trim()) return null;
  if (isWorkflowTaskContactAssigneeId(assigneeId)) return null;
  return assigneeId.trim();
}

export async function dispatchWorkflowTaskStatusTransitionInAppNotifications(input: {
  readonly supabase: SupabaseClient;
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly projectId: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
  readonly enteredNeedsApproval: boolean;
  readonly enteredRejected: boolean;
  readonly enteredCompleted: boolean;
  readonly assignedMemberId: string | null;
}): Promise<void> {
  if (!input.enteredNeedsApproval && !input.enteredRejected && !input.enteredCompleted) {
    return;
  }

  try {
    const projectContext = await loadWorkflowTaskAssignmentProjectContext(
      input.supabase,
      input.organizationId,
      input.projectId
    );
    if (projectContext == null) return;

    if (input.enteredNeedsApproval) {
      const projectAssigneeUserId = await loadProjectAssigneeUserId(
        input.supabase,
        input.organizationId,
        input.projectId
      );
      await notifyWorkflowTaskNeedsApprovalInApp({
        accessToken: input.accessToken,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        projectAssigneeUserId,
        projectContext,
        supabase: input.supabase,
      });
    }

    if (input.enteredRejected) {
      await notifyWorkflowTaskRejectedInApp({
        accessToken: input.accessToken,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        assignedMemberUserId: memberAssigneeId(input.assignedMemberId),
        projectContext,
        supabase: input.supabase,
      });
    }

    if (input.enteredCompleted) {
      await notifyWorkflowTaskCompletedInApp({
        accessToken: input.accessToken,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        assignedMemberUserId: memberAssigneeId(input.assignedMemberId),
        projectContext,
        supabase: input.supabase,
      });
    }
  } catch (err: unknown) {
    console.info(
      JSON.stringify({
        tag: 'buildcore_workflow_task_status_in_app_notification',
        event: 'dispatch_exception',
        taskId: input.taskId,
        organizationId: input.organizationId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
