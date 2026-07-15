/**
 * PATCH /api/crm/tasks/[taskId] — update a workflow task.
 * DELETE /api/crm/tasks/[taskId] — archive a workflow task.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  archiveCrmWorkflowTaskForOrg,
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
import {
  dispatchWorkflowTaskStatusTransitionNotifications,
  resolvePreviousWorkflowTaskStatusForPatch,
} from '@/infrastructure/crm/server/workflowTaskStatusTransitionNotifications';
import { dispatchWorkflowTaskAssignedInAppNotification } from '@/infrastructure/crm/server/dispatchWorkflowTaskAssignedInAppNotification';

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

  const { data: taskRow, error: taskError } = await auth.context.supabase
    .from('crm_workflow_tasks')
    .select('project_id, assigned_member_id')
    .eq('organization_id', auth.context.organizationId)
    .eq('id', taskId)
    .is('archived_at', null)
    .maybeSingle();

  if (taskError != null) {
    return NextResponse.json({ error: 'internal_error', message: taskError.message }, { status: 500 });
  }
  if (taskRow == null) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  const { data: projectRow, error: projectError } = await auth.context.supabase
    .from('crm_projects')
    .select('parent_project_id')
    .eq('organization_id', auth.context.organizationId)
    .eq('id', taskRow.project_id)
    .maybeSingle();

  if (projectError != null) {
    return NextResponse.json({ error: 'internal_error', message: projectError.message }, { status: 500 });
  }
  if (projectRow == null) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    auth.context.supabase,
    auth.context.organizationId,
    projectRow.parent_project_id != null ? 'subproject' : 'project'
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

    const previousStatus = await resolvePreviousWorkflowTaskStatusForPatch(
      auth.context.supabase,
      auth.context.organizationId,
      taskId,
      validated.patch.status
    );

    const previousAssignedMemberId =
      typeof (taskRow as { assigned_member_id?: unknown }).assigned_member_id === 'string'
        ? (taskRow as { assigned_member_id: string }).assigned_member_id
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

    await dispatchWorkflowTaskStatusTransitionNotifications({
      taskId,
      actorUserId: auth.context.user.id,
      authHeader: auth.context.authHeader,
      patchStatus: validated.patch.status,
      previousStatus,
      nextStatus: task.status,
    });

    if (validated.patch.assignedMemberId !== undefined) {
      const accessToken = auth.context.authHeader.slice('Bearer '.length).trim();
      await dispatchWorkflowTaskAssignedInAppNotification({
        supabase: auth.context.supabase,
        accessToken,
        organizationId: auth.context.organizationId,
        actorUserId: auth.context.user.id,
        projectId: (taskRow as { project_id: string }).project_id,
        taskId: task.id,
        taskTitle: task.title,
        previousAssignedMemberId,
        nextAssignedMemberId: validated.patch.assignedMemberId,
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
