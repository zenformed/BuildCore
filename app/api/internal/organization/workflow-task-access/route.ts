/**
 * GET /api/internal/organization/workflow-task-access
 * Effective workflow task permissions for the signed-in org member.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { resolveBuildCoreWorkflowTaskAccessForUser } from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { fullAdminBuildCoreWorkflowTaskAccess } from '@/domain/buildcore/rolePermissions';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(fullAdminBuildCoreWorkflowTaskAccess('owner'));
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const access = await resolveBuildCoreWorkflowTaskAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(access, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load workflow task permissions.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
