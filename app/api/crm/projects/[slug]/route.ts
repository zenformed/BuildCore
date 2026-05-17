/**
 * GET /api/crm/projects/[slug] — full project hub aggregate for the detail page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { getCrmProjectDetailBySlugForOrg } from '@/infrastructure/crm/server/crmReadService';

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
    const project = await getCrmProjectDetailBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CRM project';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
