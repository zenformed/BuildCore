import type {
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import {
  parseBuildCoreRolePermissionPatchRowJson,
  parseBuildCoreRolePermissionsJson,
} from '@/infrastructure/coreApi/parseBuildCoreRolePermissionsJson';

export { parseBuildCoreRolePermissionsJson as parseBuildCoreRolePermissionsBffJson } from '@/infrastructure/coreApi/parseBuildCoreRolePermissionsJson';

export async function fetchBuildCoreRolePermissionsBff(
  accessToken: string,
  domain: BuildCorePermissionDomain
): Promise<BuildCoreRolePermissionsResponse> {
  const res = await fetch(
    `/api/internal/organization/role-permissions?domain=${encodeURIComponent(domain)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load permissions.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreRolePermissionsJson(json, domain);
  if (parsed == null) {
    throw new Error('Invalid permissions response.');
  }
  return parsed;
}

export async function patchBuildCoreRolePermissionBff(
  accessToken: string,
  domain: BuildCorePermissionDomain,
  roleKey: BuildCorePermissionRoleKey,
  flags: BuildCoreRolePermissionFlags
): Promise<BuildCoreRolePermissionRow> {
  const res = await fetch(
    `/api/internal/organization/role-permissions/${encodeURIComponent(roleKey)}?domain=${encodeURIComponent(domain)}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flags),
      cache: 'no-store',
    }
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not update permissions.';
    throw new Error(message);
  }
  const row = parseBuildCoreRolePermissionPatchRowJson(json, domain);
  if (row == null) {
    throw new Error('Invalid permissions response.');
  }
  return row;
}
