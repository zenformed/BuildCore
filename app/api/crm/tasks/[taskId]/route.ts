/**
 * PATCH /api/crm/tasks/[taskId] — update a workflow task.
 * DELETE /api/crm/tasks/[taskId] — archive a workflow task.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  archiveCrmWorkflowTaskForOrg,
  getCrmWorkflowTaskStatusForOrg,
  updateCrmWorkflowTaskForOrg,
} from '@/infrastructure/crm/server/crmWorkflowTaskService';
import { pipelineStageSlugSet } from '@/domain/crm';
import {
  validateUpdateWorkflowTaskBody,
  type WorkflowTaskBody,
} from '@/infrastructure/crm/server/validateWorkflowTaskBody';
import { loadOrganizationPipelineStageCatalog } from '@/infrastructure/crm/server/pipelineStageService';
import {
  requireBuildCoreWorkflowTaskPermission,
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionFlagsFromAccess,
  workflowTaskPermissionForbiddenResponse,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { assertWorkflowTaskUpdateAllowed } from '@/domain/buildcore/rolePermissions';
import { notifyWorkflowTaskNeedsApprovalAfterTransition } from '@/infrastructure/crm/server/notifyWorkflowTaskNeedsApproval';
import { logNeedsApprovalNotifyDebug } from '@/infrastructure/crm/server/needsApprovalNotifyDebug';
import { env } from '@/infrastructure/config/env';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { taskId: string } };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const taskId = context.params.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  let body: WorkflowTaskBody;
  try {
    body = (await request.json()) as WorkflowTaskBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    auth.context.supabase,
    auth.context.organizationId
  );
  const validated = validateUpdateWorkflowTaskBody(body, {
    allowedStageSlugs: pipelineStageSlugSet(stageCatalog),
  });
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  try {
    const access = await resolveBuildCoreWorkflowTaskAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    const permissions = workflowTaskPermissionFlagsFromAccess(access);
    const updateCheck = assertWorkflowTaskUpdateAllowed(permissions, validated.patch);
    if (!updateCheck.ok) {
      return workflowTaskPermissionForbiddenResponse(updateCheck.message);
    }

    const previousStatus =
      validated.patch.status === 'request_review'
        ? await getCrmWorkflowTaskStatusForOrg(
            auth.context.supabase,
            auth.context.organizationId,
            taskId
          )
        : null;

    const task = await updateCrmWorkflowTaskForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      { taskId, ...validated.patch }
    );
    if (task == null) {
      return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
    }

    const enteredNeedsApproval =
      previousStatus != null &&
      previousStatus !== 'request_review' &&
      task.status === 'request_review';

    if (validated.patch.status === 'request_review') {
      logNeedsApprovalNotifyDebug('buildcore_patch_transition_check', {
        taskId,
        previousStatus,
        nextStatus: task.status,
        actorUserId: auth.context.user.id,
        enteredNeedsApproval,
        coreConfigured: env.zenformedCoreApiBaseUrl != null,
      });
    }

    if (enteredNeedsApproval) {
      const token = auth.context.authHeader.slice('Bearer '.length).trim();
      try {
        await notifyWorkflowTaskNeedsApprovalAfterTransition(token, {
          taskId,
          previousStatus,
          nextStatus: task.status,
          actorUserId: auth.context.user.id,
        });
      } catch (err: unknown) {
        logNeedsApprovalNotifyDebug('buildcore_patch_notify_exception', {
          taskId,
          previousStatus,
          nextStatus: task.status,
          actorUserId: auth.context.user.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (
      validated.patch.status === 'request_review' &&
      previousStatus === 'request_review'
    ) {
      logNeedsApprovalNotifyDebug('buildcore_patch_notify_skipped', {
        taskId,
        previousStatus,
        nextStatus: task.status,
        actorUserId: auth.context.user.id,
        skippedReason: 'already_request_review',
      });
    }

    return NextResponse.json(task);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const taskId = context.params.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  try {
    const permission = await requireBuildCoreWorkflowTaskPermission(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      (flags) => flags.canDelete,
      'You do not have permission to delete workflow tasks.'
    );
    if (!permission.ok) return permission.response;

    const archived = await archiveCrmWorkflowTaskForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      taskId
    );
    if (!archived) {
      return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to archive workflow task';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
