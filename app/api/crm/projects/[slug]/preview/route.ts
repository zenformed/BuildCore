/**
 * GET /api/crm/projects/[slug]/preview — lightweight project data for hover preview and details modal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { getCrmProjectPreviewBySlugForOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeCrmProjectSummaryForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const preview = await getCrmProjectPreviewBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    if (preview == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    const scopedSummary = await scopeCrmProjectSummaryForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      preview.summary
    );
    if (scopedSummary == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({
      summary: scopedSummary,
      notes: preview.notes,
    });
  } catch (err) {
    return mapCrmRouteError(err, 'Failed to load CRM project preview');
  }
}
