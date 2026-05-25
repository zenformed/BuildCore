/**
 * GET /api/internal/organization/role-permissions?domain=workflow_tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBuildCoreRolePermissions } from '@/infrastructure/coreApi/buildCoreRolePermissionsClient';
import { relayOrganizationGet } from '../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const domain = request.nextUrl.searchParams.get('domain') ?? 'workflow_tasks';
  if (domain !== 'workflow_tasks') {
    return NextResponse.json(
      { error: 'invalid_domain', message: 'Unsupported permission domain.' },
      { status: 400 }
    );
  }
  return relayOrganizationGet(request, (token) =>
    getBuildCoreRolePermissions(token, 'workflow_tasks')
  );
}
