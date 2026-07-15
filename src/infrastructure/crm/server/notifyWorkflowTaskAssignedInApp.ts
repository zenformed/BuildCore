/**
 * Feature orchestration for workflow_task.assigned in-app notifications.
 * Email notify-assigned remains a separate, optional channel.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { createPlatformNotificationOnCore } from '@/infrastructure/coreApi/createPlatformNotificationClient';
import { loadCrmMemberMap } from '@/infrastructure/crm/server/crmMemberMap';
import {
  buildWorkflowTaskAssignedIdempotencyKey,
  shouldNotifyWorkflowTaskAssigned,
} from '@/domain/buildcore/workflowTaskAssignedNotification';
import {
  WORKFLOW_TASK_ASSIGNED_NOTIFICATION_TITLE,
  buildWorkflowTaskAssignedDestinationPath,
  buildWorkflowTaskAssignedNotificationBody,
} from '@/domain/buildcore/workflowTaskAssignedNotificationCopy';
import { loadBuildCoreEntityTerminologyOverridesForOrg } from '@/infrastructure/crm/server/buildCoreEntityTerminologyService';
import { resolveEntityTerminology } from '@/domain/buildcore/entityTerminology';

export type WorkflowTaskAssignmentProjectContext = {
  readonly projectId: string;
  readonly projectName: string;
  readonly projectSlug: string;
  readonly parentProjectId: string | null;
  readonly parentProjectName: string | null;
  readonly parentProjectSlug: string | null;
};

export async function loadWorkflowTaskAssignmentProjectContext(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string
): Promise<WorkflowTaskAssignmentProjectContext | null> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, name, slug, parent_project_id')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data == null) return null;

  const row = data as {
    id: string;
    name: string;
    slug: string;
    parent_project_id: string | null;
  };

  if (row.parent_project_id == null) {
    return {
      projectId: row.id,
      projectName: row.name,
      projectSlug: row.slug,
      parentProjectId: null,
      parentProjectName: null,
      parentProjectSlug: null,
    };
  }

  const { data: parent, error: parentError } = await supabase
    .from('crm_projects')
    .select('id, name, slug')
    .eq('organization_id', organizationId)
    .eq('id', row.parent_project_id)
    .maybeSingle();

  if (parentError) throw new Error(parentError.message);
  const parentRow = parent as { id: string; name: string; slug: string } | null;

  return {
    projectId: row.id,
    projectName: row.name,
    projectSlug: row.slug,
    parentProjectId: parentRow?.id ?? row.parent_project_id,
    parentProjectName: parentRow?.name ?? null,
    parentProjectSlug: parentRow?.slug ?? null,
  };
}

function logAssignedNotifyFailure(
  fields: Readonly<Record<string, unknown>>
): void {
  console.info(
    JSON.stringify({
      tag: 'buildcore_workflow_task_assigned_notification',
      event: 'create_failed',
      ...fields,
    })
  );
}

export type NotifyWorkflowTaskAssignedInput = {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly previousAssignedMemberId: string | null;
  readonly nextAssignedMemberId: string | null;
  readonly assignedAt: string | null;
  readonly taskId: string;
  readonly taskTitle: string;
  readonly projectContext: WorkflowTaskAssignmentProjectContext;
  readonly supabase: SupabaseClient;
};

/**
 * After a successful assignment persist, attempt Core in-app notification.
 * Never throws — assignment success is preserved on notify failure.
 * Demo runtime skips Core entirely.
 */
export async function notifyWorkflowTaskAssignedInApp(
  input: NotifyWorkflowTaskAssignedInput
): Promise<{ readonly attempted: boolean; readonly ok: boolean }> {
  if (runtimeModes.isDemoRuntime()) {
    // Demo must not call production ZenformedCore notification create.
    return { attempted: false, ok: true };
  }

  if (
    !shouldNotifyWorkflowTaskAssigned({
      previousAssignedMemberId: input.previousAssignedMemberId,
      nextAssignedMemberId: input.nextAssignedMemberId,
      actorUserId: input.actorUserId,
    })
  ) {
    return { attempted: false, ok: true };
  }

  const recipientUserId = input.nextAssignedMemberId!.trim();
  const assignedAt = input.assignedAt?.trim() || null;
  if (!assignedAt) {
    logAssignedNotifyFailure({
      taskId: input.taskId,
      organizationId: input.organizationId,
      reason: 'missing_assigned_at',
    });
    return { attempted: true, ok: false };
  }

  const memberIds = [input.actorUserId, recipientUserId];
  const memberMap = await loadCrmMemberMap(input.supabase, memberIds, {
    organizationId: input.organizationId,
  });
  const actorName = memberMap.get(input.actorUserId)?.displayName ?? 'Someone';

  // Load terminology so renamed Project/Subproject labels stay available for future copy;
  // current sentence uses entity names (see product copy examples).
  await loadBuildCoreEntityTerminologyOverridesForOrg(
    input.supabase,
    input.organizationId
  ).then((overrides) => resolveEntityTerminology(overrides)).catch(() => null);

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

  const body = buildWorkflowTaskAssignedNotificationBody({
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
      type: 'workflow_task.assigned',
      title: WORKFLOW_TASK_ASSIGNED_NOTIFICATION_TITLE,
      body,
      destinationUrl,
      actorUserId: input.actorUserId,
      entityType: 'workflow_task',
      entityId: input.taskId,
      metadata,
      idempotencyKey: buildWorkflowTaskAssignedIdempotencyKey({
        taskId: input.taskId,
        recipientUserId,
        assignedAt,
      }),
    }
  );

  if (!result.ok) {
    logAssignedNotifyFailure({
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
