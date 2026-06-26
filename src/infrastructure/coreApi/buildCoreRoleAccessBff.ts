import type { BuildCorePaymentAccess, BuildCoreRoleAccess } from '@/domain/buildcore/roleAccessPermissions';
import { DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW } from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

function parseBuildCoreRoleAccessBase(json: unknown): BuildCoreRoleAccess | null {
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
    typeof o.canSendFiles !== 'boolean' ||
    typeof o.canViewAllStages !== 'boolean'
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
    actorRole: (actorRole ?? null) as BuildCoreRoleAccess['actorRole'],
    roleKey: (roleKey ?? null) as BuildCoreRoleAccess['roleKey'],
    canView: o.canView,
    canCreate: o.canCreate,
    canEdit: o.canEdit,
    canDelete: o.canDelete,
    canApprove: o.canApprove,
    canUpload: o.canUpload,
    canDownload: o.canDownload,
    canSendFiles: o.canSendFiles,
    canViewAllStages: o.canViewAllStages,
  };
}

export function parseBuildCoreRoleAccessJson(json: unknown): BuildCoreRoleAccess | null {
  return parseBuildCoreRoleAccessBase(json);
}

export function parseBuildCorePaymentAccessJson(json: unknown): BuildCorePaymentAccess | null {
  const base = parseBuildCoreRoleAccessBase(json);
  if (base == null) return null;
  const o = json as Record<string, unknown>;
  return {
    ...base,
    onlyAssignedUserCanView:
      typeof o.onlyAssignedUserCanView === 'boolean'
        ? o.onlyAssignedUserCanView
        : DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
    viewerUserId: typeof o.viewerUserId === 'string' ? o.viewerUserId : null,
    memberRoleUserIds: Array.isArray(o.memberRoleUserIds)
      ? o.memberRoleUserIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export async function fetchBuildCoreRoleAccessBff(
  accessToken: string,
  domain: 'payments' | 'budget'
): Promise<BuildCoreRoleAccess | BuildCorePaymentAccess> {
  const res = await fetch(
    buildCoreAdminFetchUrl(
      `/api/internal/organization/role-access?domain=${encodeURIComponent(domain)}`
    ),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid role permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load role permissions.';
    throw new Error(message);
  }
  const parsed =
    domain === 'payments'
      ? parseBuildCorePaymentAccessJson(json)
      : parseBuildCoreRoleAccessJson(json);
  if (parsed == null) {
    throw new Error('Invalid role permissions response.');
  }
  return parsed;
}
