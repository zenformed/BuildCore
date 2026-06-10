import { getOrganizationMembershipContext } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';
import type { ZenformedCoreOrganizationMembershipContextResponse } from '@/infrastructure/coreApi/types';
import {
  applyAuthoritativeOrganizationPermissions,
  resolveOrganizationPermissionsFromRole,
  type OrganizationMemberRole,
  type OrganizationPermissions,
} from '@zenformed/core/server';

export function authoritativeOrganizationPermissions(
  role: OrganizationMemberRole | null | undefined
): OrganizationPermissions {
  return resolveOrganizationPermissionsFromRole(role);
}

export async function fetchAuthoritativeMembershipContext(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationMembershipContextResponse>> {
  const result = await getOrganizationMembershipContext(accessToken);
  if (!result.ok) return result;
  return {
    ok: true,
    data: applyAuthoritativeOrganizationPermissions(result.data),
  };
}

export async function requireOrganizationPermission(
  accessToken: string,
  permission: keyof OrganizationPermissions
): Promise<{ ok: true } | { ok: false; status: 403 }> {
  const context = await fetchAuthoritativeMembershipContext(accessToken);
  if (!context.ok) {
    return { ok: false, status: 403 };
  }
  if (!context.data.permissions[permission]) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}
