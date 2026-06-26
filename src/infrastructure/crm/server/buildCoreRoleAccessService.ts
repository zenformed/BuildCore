/**
 * Resolve persisted BuildCore payment/budget permissions for runtime UI and API enforcement.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import {
  fullOwnerBuildCoreRoleAccess,
  resolveBuildCoreRoleAccess,
  type BuildCorePaymentAccess,
  type BuildCoreRoleAccess,
} from '@/domain/buildcore/roleAccessPermissions';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { loadBuildCoreRolePermissionRows } from './buildCoreRolePermissionService';
import { resolveBuildCorePaymentMemberVisibilityInput } from './buildCorePaymentVisibilityService';

export async function resolveBuildCoreRoleAccessForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  domain: Extract<BuildCorePermissionDomain, 'payments' | 'budget'>
): Promise<BuildCoreRoleAccess | BuildCorePaymentAccess> {
  if (runtimeModes.useMockAuth()) {
    return fullOwnerBuildCoreRoleAccess();
  }

  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const rows = await loadBuildCoreRolePermissionRows(supabase, organizationId, domain);
  const base = resolveBuildCoreRoleAccess(domain, actorRole, rows);

  if (domain !== 'payments' || actorRole !== 'member') {
    return base;
  }

  const visibilityInput = await resolveBuildCorePaymentMemberVisibilityInput(
    supabase,
    organizationId,
    userId
  );

  return {
    ...base,
    onlyAssignedUserCanView: visibilityInput.onlyAssignedUserCanViewPayments ?? true,
    viewerUserId: visibilityInput.viewerUserId,
    memberRoleUserIds: visibilityInput.memberRoleUserIds,
  };
}
