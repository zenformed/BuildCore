/**
 * Feature orchestration for workflow_task.needs_approval in-app notifications.
 * Email notify-needs-approval remains a separate channel (same recipient rules).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { createPlatformNotificationOnCore } from '@/infrastructure/coreApi/createPlatformNotificationClient';
import { loadCrmMemberMap } from '@/infrastructure/crm/server/crmMemberMap';
import {
  buildWorkflowTaskNeedsApprovalIdempotencyKey,
  shouldNotifyWorkflowTaskNeedsApproval,
} from '@/domain/buildcore/workflowTaskNeedsApprovalNotification';
import {
  WORKFLOW_TASK_NEEDS_APPROVAL_NOTIFICATION_TITLE,
  buildWorkflowTaskNeedsApprovalNotificationBody,
} from '@/domain/buildcore/workflowTaskNeedsApprovalNotificationCopy';
import { buildWorkflowTaskAssignedDestinationPath } from '@/domain/buildcore/workflowTaskAssignedNotificationCopy';
import {
  loadWorkflowTaskAssignmentProjectContext,
  type WorkflowTaskAssignmentProjectContext,
} from '@/infrastructure/crm/server/notifyWorkflowTaskAssignedInApp';

function logNeedsApprovalInAppFailure(fields: Readonly<Record<string, unknown>>): void {
  console.info(
    JSON.stringify({
      tag: 'buildcore_workflow_task_needs_approval_notification',
      event: 'create_failed',
      ...fields,
    })
  );
}

export type NotifyWorkflowTaskNeedsApprovalInAppInput = {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly projectAssigneeUserId: string | null;
  readonly projectContext: WorkflowTaskAssignmentProjectContext;
  readonly supabase: SupabaseClient;
};

export async function notifyWorkflowTaskNeedsApprovalInApp(
  input: NotifyWorkflowTaskNeedsApprovalInAppInput
): Promise<{ readonly attempted: boolean; readonly ok: boolean }> {
  if (runtimeModes.isDemoRuntime()) {
    return { attempted: false, ok: true };
  }

  if (
    !shouldNotifyWorkflowTaskNeedsApproval({
      recipientUserId: input.projectAssigneeUserId,
      actorUserId: input.actorUserId,
    })
  ) {
    return { attempted: false, ok: true };
  }

  const recipientUserId = input.projectAssigneeUserId!.trim();
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

  const body = buildWorkflowTaskNeedsApprovalNotificationBody({
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
      type: 'workflow_task.needs_approval',
      title: WORKFLOW_TASK_NEEDS_APPROVAL_NOTIFICATION_TITLE,
      body,
      destinationUrl,
      actorUserId: input.actorUserId,
      entityType: 'workflow_task',
      entityId: input.taskId,
      metadata,
      idempotencyKey: buildWorkflowTaskNeedsApprovalIdempotencyKey({
        taskId: input.taskId,
        recipientUserId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
      }),
    }
  );

  if (!result.ok) {
    logNeedsApprovalInAppFailure({
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

export async function loadProjectAssigneeUserId(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('assigned_member_id')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const id =
    data != null && typeof (data as { assigned_member_id?: unknown }).assigned_member_id === 'string'
      ? (data as { assigned_member_id: string }).assigned_member_id.trim()
      : '';
  return id || null;
}

export { loadWorkflowTaskAssignmentProjectContext };
