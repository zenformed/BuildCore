/**
 * GET /api/internal/organization/role-permissions?domain=workflow_tasks|payments|budget
 * BuildCore-only read from buildcore_role_permissions (not ForgeCore relay).
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseBuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreRolePermissionsResponse,
  buildDefaultBuildCoreRolePermissionsResponse,
} from '@/infrastructure/crm/server/buildCoreRolePermissionService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const domain = parseBuildCorePermissionDomain(
    request.nextUrl.searchParams.get('domain') ?? 'workflow_tasks'
  );
  if (domain == null) {
    return NextResponse.json(
      { error: 'invalid_domain', message: 'Unsupported permission domain.' },
      { status: 400 }
    );
  }

  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreRolePermissionsResponse(domain));
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCoreRolePermissionsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      domain
    );
    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not load BuildCore role permissions.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
