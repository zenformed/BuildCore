import type { BuildCoreRoleAccess } from '@/domain/buildcore/roleAccessPermissions';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export function parseBuildCoreRoleAccessJson(json: unknown): BuildCoreRoleAccess | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.canView !== 'boolean' ||
    typeof o.canCreate !== 'boolean' ||
    typeof o.canEdit !== 'boolean' ||
    typeof o.canDelete !== 'boolean' ||
    typeof o.canApprove !== 'boolean' ||
    typeof o.canUpload !== 'boolean' ||
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
    actorRole: (actorRole ?? null) as BuildCoreRoleAccess['actorRole'],
    roleKey: (roleKey ?? null) as BuildCoreRoleAccess['roleKey'],
    canView: o.canView,
    canCreate: o.canCreate,
    canEdit: o.canEdit,
    canDelete: o.canDelete,
    canApprove: o.canApprove,
    canUpload: o.canUpload,
    canSendFiles: o.canSendFiles,
  };
}

export async function fetchBuildCoreRoleAccessBff(
  accessToken: string,
  domain: 'payments' | 'budget'
): Promise<BuildCoreRoleAccess> {
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
  const parsed = parseBuildCoreRoleAccessJson(json);
  if (parsed == null) {
    throw new Error('Invalid role permissions response.');
  }
  return parsed;
}
