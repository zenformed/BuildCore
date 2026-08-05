/**
 * GET /api/crm/projects/[slug]/subprojects/v2/count
 * Exact filtered count of direct Subprojects for one parent Project (Phase 2A).
 * Behind BUILDCORE_PROJECTS_LIST_V2 / org allowlist. No v1 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertProjectsListV2EnabledForOrganization } from '@/infrastructure/crm/server/listV2/projectsListV2FeatureGate';
import { parseCrmProjectsListV2ChildrenQuery } from '@/infrastructure/crm/server/listV2/projectsListV2QueryParams';
import { resolveAccessibleRootParentBySlugForChildrenListV2 } from '@/infrastructure/crm/server/listV2/resolveParentProjectForChildrenListV2';
import {
  CrmProjectsListV2InvalidRequestError,
  countCrmProjectsListV2,
} from '@/infrastructure/crm/server/listV2/projectsListV2Service';
import { logCrmProjectsListV2Event } from '@/infrastructure/crm/server/listV2';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const disabled = assertProjectsListV2EnabledForOrganization(auth.context.organizationId);
  if (disabled != null) return disabled;

  const parentSlug = context.params.slug?.trim();
  if (!parentSlug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const parent = await resolveAccessibleRootParentBySlugForChildrenListV2(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      parentSlug
    );
    if (parent == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const parsed = parseCrmProjectsListV2ChildrenQuery(request.nextUrl.searchParams, parent.id);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: 'invalid_request', message: parsed.message },
        { status: 400 }
      );
    }

    const count = await countCrmProjectsListV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      request: parsed.request,
    });
    return NextResponse.json(count, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    if (err instanceof CrmProjectsListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmProjectsListV2Event({
      name: 'crm.projects_list_v2.db_failure',
      view: 'children_of_parent',
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to count CRM subprojects v2');
  }
}
