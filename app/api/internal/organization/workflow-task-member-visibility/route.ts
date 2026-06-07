/**
 * GET/PATCH /api/internal/organization/workflow-task-member-visibility
 * BuildCore-only setting for member workflow task visibility (not ForgeCore relay).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isBuildCoreTeamsManagerRole } from '@/domain/buildcore/memberRole';
import { DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW } from '@/domain/buildcore/workflowTaskMemberVisibility';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  loadActiveBuildCoreMemberUserIdsForOrg,
  loadActiveOrganizationMemberRole,
  loadBuildCoreWorkflowTaskVisibilitySettings,
  saveBuildCoreWorkflowTaskVisibilitySettings,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

function defaultResponse(canEdit: boolean) {
  return NextResponse.json(
    {
      onlyAssignedUserCanView: DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
      canEdit,
      memberRoleUserIds: [] as string[],
    },
    { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return defaultResponse(true);
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const actorRole = await loadActiveOrganizationMemberRole(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    const settings = await loadBuildCoreWorkflowTaskVisibilitySettings(
      auth.context.supabase,
      auth.context.organizationId
    );
    return NextResponse.json(
      {
        onlyAssignedUserCanView: settings.onlyAssignedUserCanView,
        canEdit: isBuildCoreTeamsManagerRole(actorRole),
        memberRoleUserIds: await loadActiveBuildCoreMemberUserIdsForOrg(
          auth.context.supabase,
          auth.context.organizationId
        ),
      },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not load workflow task visibility settings.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(
      { onlyAssignedUserCanView: DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW, canEdit: true },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!isBuildCoreTeamsManagerRole(actorRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to update this setting.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  if (
    body == null ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>).onlyAssignedUserCanView !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'onlyAssignedUserCanView boolean is required.' },
      { status: 400 }
    );
  }

  try {
    const saved = await saveBuildCoreWorkflowTaskVisibilitySettings(
      auth.context.supabase,
      auth.context.organizationId,
      {
        onlyAssignedUserCanView: (body as Record<string, unknown>).onlyAssignedUserCanView as boolean,
      }
    );
    return NextResponse.json(
      {
        onlyAssignedUserCanView: saved.onlyAssignedUserCanView,
        canEdit: true,
        memberRoleUserIds: await loadActiveBuildCoreMemberUserIdsForOrg(
          auth.context.supabase,
          auth.context.organizationId
        ),
      },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save workflow task visibility settings.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
