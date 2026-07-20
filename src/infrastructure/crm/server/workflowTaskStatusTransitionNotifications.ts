import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowTaskStatus } from '@/domain/crm';
import { env } from '@/infrastructure/config/env';
import { getCrmWorkflowTaskStatusForOrg } from '@/infrastructure/crm/server/crmWorkflowTaskService';
import { dispatchWorkflowTaskStatusTransitionInAppNotifications } from '@/infrastructure/crm/server/dispatchWorkflowTaskStatusTransitionInAppNotifications';
import { logNeedsApprovalNotifyDebug } from '@/infrastructure/crm/server/needsApprovalNotifyDebug';
import { notifyWorkflowTaskNeedsApprovalAfterTransition } from '@/infrastructure/crm/server/notifyWorkflowTaskNeedsApproval';
import { notifyWorkflowTaskRejectedAfterTransition } from '@/infrastructure/crm/server/notifyWorkflowTaskRejectedAfterTransition';
import { didEnterWorkflowTaskStatus } from '@/infrastructure/crm/server/workflowTaskStatusTransition';

type WorkflowTaskStatusNotificationContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly projectId: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly assignedMemberId: string | null;
  readonly actorUserId: string;
  readonly authHeader: string;
  readonly patchStatus: WorkflowTaskStatus | undefined;
  readonly previousStatus: WorkflowTaskStatus | null;
  readonly nextStatus: WorkflowTaskStatus;
};

export async function dispatchWorkflowTaskStatusTransitionNotifications(
  context: WorkflowTaskStatusNotificationContext
): Promise<void> {
  const {
    supabase,
    organizationId,
    projectId,
    taskId,
    taskTitle,
    assignedMemberId,
    actorUserId,
    authHeader,
    patchStatus,
    previousStatus,
    nextStatus,
  } = context;

  if (patchStatus == null || previousStatus == null) return;

  const enteredNeedsApproval = didEnterWorkflowTaskStatus(
    previousStatus,
    nextStatus,
    'request_review'
  );
  const enteredRejected = didEnterWorkflowTaskStatus(previousStatus, nextStatus, 'rejected');
  const enteredCompleted = didEnterWorkflowTaskStatus(previousStatus, nextStatus, 'done');

  if (patchStatus === 'request_review' || patchStatus === 'rejected') {
    logNeedsApprovalNotifyDebug('buildcore_patch_transition_check', {
      taskId,
      previousStatus,
      nextStatus,
      actorUserId,
      enteredNeedsApproval,
      enteredRejected,
      coreConfigured: env.zenformedCoreApiBaseUrl != null,
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (enteredNeedsApproval) {
    try {
      await notifyWorkflowTaskNeedsApprovalAfterTransition(token, {
        taskId,
        previousStatus,
        nextStatus,
        actorUserId,
      });
    } catch (err: unknown) {
      logNeedsApprovalNotifyDebug('buildcore_patch_notify_exception', {
        taskId,
        previousStatus,
        nextStatus,
        actorUserId,
        notification: 'needs_approval',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (patchStatus === 'request_review' && previousStatus === 'request_review') {
    logNeedsApprovalNotifyDebug('buildcore_patch_notify_skipped', {
      taskId,
      previousStatus,
      nextStatus,
      actorUserId,
      skippedReason: 'already_request_review',
    });
  }

  if (enteredRejected) {
    try {
      await notifyWorkflowTaskRejectedAfterTransition(token, {
        taskId,
        previousStatus,
        nextStatus,
        actorUserId,
      });
    } catch (err: unknown) {
      logNeedsApprovalNotifyDebug('buildcore_patch_notify_exception', {
        taskId,
        previousStatus,
        nextStatus,
        actorUserId,
        notification: 'rejected',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (patchStatus === 'rejected' && previousStatus === 'rejected') {
    logNeedsApprovalNotifyDebug('buildcore_patch_notify_skipped', {
      taskId,
      previousStatus,
      nextStatus,
      actorUserId,
      skippedReason: 'already_rejected',
    });
  }

  if (enteredNeedsApproval || enteredRejected || enteredCompleted) {
    await dispatchWorkflowTaskStatusTransitionInAppNotifications({
      supabase,
      accessToken: token,
      organizationId,
      actorUserId,
      projectId,
      taskId,
      taskTitle,
      previousStatus,
      nextStatus,
      enteredNeedsApproval,
      enteredRejected,
      enteredCompleted,
      assignedMemberId,
    });
  }
}

export async function resolvePreviousWorkflowTaskStatusForPatch(
  supabase: Parameters<typeof getCrmWorkflowTaskStatusForOrg>[0],
  organizationId: string,
  taskId: string,
  patchStatus: WorkflowTaskStatus | undefined
): Promise<WorkflowTaskStatus | null> {
  if (patchStatus == null) return null;
  return getCrmWorkflowTaskStatusForOrg(supabase, organizationId, taskId);
}
