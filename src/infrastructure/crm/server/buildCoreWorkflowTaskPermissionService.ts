/**
 * Resolve persisted BuildCore workflow task permissions for CRM API enforcement.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import {
  resolveBuildCoreWorkflowTaskPermissions,
  fullOwnerBuildCoreWorkflowTaskAccess,
  type BuildCoreRolePermissionFlags,
  type BuildCoreWorkflowTaskAccess,
} from '@/domain/buildcore/rolePermissions';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import {
  loadActiveOrganizationMemberRole,
  resolveBuildCoreWorkflowTaskMemberVisibilityInput,
} from './buildCoreWorkflowTaskVisibilityService';
import { loadBuildCoreRolePermissionRows } from './buildCoreRolePermissionService';

export async function resolveBuildCoreWorkflowTaskAccessForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreWorkflowTaskAccess> {
  if (runtimeModes.useMockAuth()) {
    return fullOwnerBuildCoreWorkflowTaskAccess();
  }

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const rows = await loadBuildCoreRolePermissionRows(supabase, organizationId, 'workflow_tasks');
  const base = resolveBuildCoreWorkflowTaskPermissions(actorRole, rows);

  if (actorRole !== 'member') {
    return base;
  }

  const visibilityInput = await resolveBuildCoreWorkflowTaskMemberVisibilityInput(
    supabase,
    organizationId,
    userId
  );

  return {
    ...base,
    onlyAssignedUserCanView: visibilityInput.onlyAssignedUserCanView,
    viewerUserId: visibilityInput.viewerUserId,
    memberRoleUserIds: visibilityInput.memberRoleUserIds,
  };
}

export function workflowTaskPermissionFlagsFromAccess(
  access: BuildCoreWorkflowTaskAccess
): BuildCoreRolePermissionFlags {
  return {
    canView: access.canView,
    canCreate: access.canCreate,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
    canApprove: access.canApprove,
    canUpload: access.canUpload,
    canSendFiles: access.canSendFiles,
  };
}

export function workflowTaskPermissionForbiddenResponse(message: string): NextResponse {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 });
}

export async function requireBuildCoreWorkflowTaskPermission(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  check: (flags: BuildCoreRolePermissionFlags) => boolean,
  message: string
): Promise<
  | { ok: true; permissions: BuildCoreRolePermissionFlags }
  | { ok: false; response: NextResponse }
> {
  const access = await resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId);
  const permissions = workflowTaskPermissionFlagsFromAccess(access);
  if (!check(permissions)) {
    return { ok: false, response: workflowTaskPermissionForbiddenResponse(message) };
  }
  return { ok: true, permissions };
}
