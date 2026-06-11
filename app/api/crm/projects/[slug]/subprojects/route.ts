/**
 * GET /api/crm/projects/[slug]/subprojects — child project summaries for a parent project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listCrmProjectSummariesForOrg } from '@/infrastructure/crm/server/crmReadService';
import {
  memberCanAccessProjectIdForViewer,
  scopeCrmProjectSummariesForViewer,
} from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';

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
    const allSummaries = await listCrmProjectSummariesForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { rootsOnly: false }
    );
    const parent = allSummaries.find(
      (project) => project.slug === parentSlug && project.parentProjectId == null
    );
    if (parent == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const canAccessParent = await memberCanAccessProjectIdForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      parent.id
    );
    if (!canAccessParent) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const childSummaries = allSummaries.filter(
      (project) => project.parentProjectId === parent.id
    );
    const projects = await scopeCrmProjectSummariesForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      childSummaries
    );
    return NextResponse.json(
      { projects, total: projects.length },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load subprojects';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
