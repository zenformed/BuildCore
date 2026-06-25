import type { BuildCoreWorkflowTaskAccess } from '@/domain/buildcore/rolePermissions';
import { DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW } from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export function parseBuildCoreWorkflowTaskAccessJson(json: unknown): BuildCoreWorkflowTaskAccess | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.canView !== 'boolean' ||
    typeof o.canCreate !== 'boolean' ||
    typeof o.canEdit !== 'boolean' ||
    typeof o.canDelete !== 'boolean' ||
    typeof o.canApprove !== 'boolean' ||
    typeof o.canUpload !== 'boolean' ||
    typeof o.canDownload !== 'boolean' ||
    typeof o.canSendFiles !== 'boolean'
  ) {
    return null;
  }

  const actorRole = o.actorRole;
  if (
    actorRole != null &&
    actorRole !== 'owner' &&
    actorRole !== 'admin' &&
    actorRole !== 'coordinator' &&
    actorRole !== 'member'
  ) {
    return null;
  }

  const roleKey = o.roleKey;
  if (roleKey != null && roleKey !== 'admin' && roleKey !== 'coordinator' && roleKey !== 'member') {
    return null;
  }

  return {
    actorRole: (actorRole ?? null) as BuildCoreWorkflowTaskAccess['actorRole'],
    roleKey: (roleKey ?? null) as BuildCoreWorkflowTaskAccess['roleKey'],
    canView: o.canView,
    canCreate: o.canCreate,
    canEdit: o.canEdit,
    canDelete: o.canDelete,
    canApprove: o.canApprove,
    canUpload: o.canUpload,
    canDownload: o.canDownload,
    canSendFiles: o.canSendFiles,
    onlyAssignedUserCanView:
      typeof o.onlyAssignedUserCanView === 'boolean'
        ? o.onlyAssignedUserCanView
        : DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
    viewerUserId: typeof o.viewerUserId === 'string' ? o.viewerUserId : null,
    memberRoleUserIds: Array.isArray(o.memberRoleUserIds)
      ? o.memberRoleUserIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export async function fetchBuildCoreWorkflowTaskAccessBff(
  accessToken: string
): Promise<BuildCoreWorkflowTaskAccess> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-access'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid workflow task permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load workflow task permissions.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskAccessJson(json);
  if (parsed == null) {
    throw new Error('Invalid workflow task permissions response.');
  }
  return parsed;
}
