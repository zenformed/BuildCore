/**
 * GET /api/crm/projects — org-scoped project summaries for the dashboard pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listCrmProjectSummariesForOrg } from '@/infrastructure/crm/server/crmReadService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const projects = await listCrmProjectSummariesForOrg(
      auth.context.supabase,
      auth.context.organizationId
    );
    return NextResponse.json({
      projects,
      total: projects.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CRM projects';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
