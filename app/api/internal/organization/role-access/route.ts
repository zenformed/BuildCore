/**
 * GET /api/internal/organization/role-access?domain=payments|budget
 * Effective payment/budget permissions for the signed-in org member.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fullAdminBuildCoreRoleAccess } from '@/domain/buildcore/roleAccessPermissions';
import { parseBuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { resolveBuildCoreRoleAccessForUser } from '@/infrastructure/crm/server/buildCoreRoleAccessService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const domainParam = parseBuildCorePermissionDomain(request.nextUrl.searchParams.get('domain') ?? '');
  if (domainParam !== 'payments' && domainParam !== 'budget') {
    return NextResponse.json(
      { error: 'invalid_domain', message: 'Unsupported permission domain.' },
      { status: 400 }
    );
  }

  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(fullAdminBuildCoreRoleAccess('owner'), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const access = await resolveBuildCoreRoleAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      domainParam
    );
    return NextResponse.json(access, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load role permissions.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
