/**
 * GET /api/crm/reports — org-scoped project details for CRM reports dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreReportsAccess } from '@/infrastructure/crm/server/buildCoreReportsAccess';
import { listCrmProjectsForReportingForOrg } from '@/infrastructure/crm/server/crmReadService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreReportsAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!access.ok) return access.response;

  try {
    const projects = await listCrmProjectsForReportingForOrg(
      auth.context.supabase,
      auth.context.organizationId
    );
    return NextResponse.json({
      projects,
      total: projects.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CRM reports data';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
