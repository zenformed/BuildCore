/**
 * GET /api/crm/projects/[slug]/subprojects — child project summaries for a parent project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  getCrmProjectDetailBySlugForOrg,
  listCrmProjectChildSummariesForOrg,
} from '@/infrastructure/crm/server/crmReadService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const parentSlug = context.params.slug?.trim();
  if (!parentSlug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const parent = await getCrmProjectDetailBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      parentSlug
    );
    if (parent == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const projects = await listCrmProjectChildSummariesForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      parent.summary.id
    );
    return NextResponse.json({ projects, total: projects.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load subprojects';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
