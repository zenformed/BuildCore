/**
 * Feature orchestration for workflow_task.completed in-app notifications.
 * In-app only — no email channel for this event.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { createPlatformNotificationOnCore } from '@/infrastructure/coreApi/createPlatformNotificationClient';
import { loadCrmMemberMap } from '@/infrastructure/crm/server/crmMemberMap';
import {
  buildWorkflowTaskCompletedIdempotencyKey,
  shouldNotifyWorkflowTaskCompleted,
} from '@/domain/buildcore/workflowTaskCompletedNotification';
import {
  WORKFLOW_TASK_COMPLETED_NOTIFICATION_TITLE,
  buildWorkflowTaskCompletedNotificationBody,
} from '@/domain/buildcore/workflowTaskCompletedNotificationCopy';
import { buildWorkflowTaskAssignedDestinationPath } from '@/domain/buildcore/workflowTaskAssignedNotificationCopy';
import type { WorkflowTaskAssignmentProjectContext } from '@/infrastructure/crm/server/notifyWorkflowTaskAssignedInApp';

function logCompletedInAppFailure(fields: Readonly<Record<string, unknown>>): void {
  console.info(
    JSON.stringify({
      tag: 'buildcore_workflow_task_completed_notification',
      event: 'create_failed',
      ...fields,
    })
  );
}

export type NotifyWorkflowTaskCompletedInAppInput = {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly assignedMemberUserId: string | null;
  readonly projectContext: WorkflowTaskAssignmentProjectContext;
  readonly supabase: SupabaseClient;
};

export async function notifyWorkflowTaskCompletedInApp(
  input: NotifyWorkflowTaskCompletedInAppInput
): Promise<{ readonly attempted: boolean; readonly ok: boolean }> {
  if (runtimeModes.isDemoRuntime()) {
    return { attempted: false, ok: true };
  }

  if (
    !shouldNotifyWorkflowTaskCompleted({
      recipientUserId: input.assignedMemberUserId,
      actorUserId: input.actorUserId,
    })
  ) {
    return { attempted: false, ok: true };
  }

  const recipientUserId = input.assignedMemberUserId!.trim();
  const memberMap = await loadCrmMemberMap(input.supabase, [input.actorUserId, recipientUserId], {
    organizationId: input.organizationId,
  });
  const actorName = memberMap.get(input.actorUserId)?.displayName ?? 'Someone';

  const ctx = input.projectContext;
  const isSubproject = ctx.parentProjectId != null;
  const projectName = isSubproject
    ? (ctx.parentProjectName ?? ctx.projectName)
    : ctx.projectName;
  const subprojectName = isSubproject ? ctx.projectName : null;
  const parentRouteSlug = isSubproject
    ? (ctx.parentProjectSlug ?? ctx.projectSlug)
    : ctx.projectSlug;
  const subSlug = isSubproject ? ctx.projectSlug : null;

  const destinationPath = buildWorkflowTaskAssignedDestinationPath({
    parentRouteSlug,
    subSlug,
  });
  const destinationUrl = joinBuildCorePublicAppUrl(destinationPath);

  const body = buildWorkflowTaskCompletedNotificationBody({
    actorDisplayName: actorName,
    taskTitle: input.taskTitle,
    projectName,
    subprojectName,
  });

  const metadata: Record<string, unknown> = {
    workflowTaskId: input.taskId,
    workflowTaskTitle: input.taskTitle,
    projectId: isSubproject ? (ctx.parentProjectId ?? ctx.projectId) : ctx.projectId,
    projectName,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
  };
  if (isSubproject) {
    metadata.subprojectId = ctx.projectId;
    metadata.subprojectName = ctx.projectName;
  }

  const result = await createPlatformNotificationOnCore(
    input.accessToken,
    input.organizationId,
    {
      recipientUserId,
      appSlug: 'buildcore',
      type: 'workflow_task.completed',
      title: WORKFLOW_TASK_COMPLETED_NOTIFICATION_TITLE,
      body,
      destinationUrl,
      actorUserId: input.actorUserId,
      entityType: 'workflow_task',
      entityId: input.taskId,
      metadata,
      idempotencyKey: buildWorkflowTaskCompletedIdempotencyKey({
        taskId: input.taskId,
        recipientUserId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
      }),
    }
  );

  if (!result.ok) {
    logCompletedInAppFailure({
      taskId: input.taskId,
      organizationId: input.organizationId,
      recipientUserId,
      errorKind: result.error.kind,
      status: result.error.kind === 'http_error' ? result.error.status : undefined,
    });
    return { attempted: true, ok: false };
  }

  return { attempted: true, ok: true };
}
