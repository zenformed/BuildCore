/**
 * Shared BuildCore role permission resolution and enforcement for CRM API routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type {
  BuildCorePermissionDomain,
  BuildCoreRolePermissionFlags,
} from '@/domain/buildcore/rolePermissions';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';
import {
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionFlagsFromAccess,
  workflowTaskPermissionForbiddenResponse,
} from './buildCoreWorkflowTaskPermissionService';

export async function resolveBuildCoreEffectivePermissionFlags(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  domain: BuildCorePermissionDomain
): Promise<BuildCoreRolePermissionFlags> {
  if (domain === 'workflow_tasks') {
    return workflowTaskPermissionFlagsFromAccess(
      await resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId)
    );
  }

  return resolveBuildCoreRoleAccessForUser(
    supabase,
    organizationId,
    userId,
    domain === 'payments' ? 'payments' : 'budget'
  );
}

export async function requireBuildCoreRolePermissionFlag(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  domain: BuildCorePermissionDomain,
  check: (flags: BuildCoreRolePermissionFlags) => boolean,
  message: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const flags = await resolveBuildCoreEffectivePermissionFlags(
    supabase,
    organizationId,
    userId,
    domain
  );

  if (!check(flags)) {
    return { ok: false, response: workflowTaskPermissionForbiddenResponse(message) };
  }

  return { ok: true };
}
