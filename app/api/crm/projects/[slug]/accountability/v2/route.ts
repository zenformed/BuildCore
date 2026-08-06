/**
 * GET /api/crm/projects/[slug]/accountability/v2
 * Project-scoped Accountability keyset page (Load More).
 * Behind BUILDCORE_PROJECTS_LIST_V2 / org allowlist. No v1 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeCrmAccountabilityListV2Request } from '@/domain/crm/accountabilityListV2';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertProjectsListV2EnabledForOrganization } from '@/infrastructure/crm/server/listV2/projectsListV2FeatureGate';
import {
  CrmAccountabilityListV2ForbiddenError,
  CrmAccountabilityListV2InvalidCursorError,
  CrmAccountabilityListV2InvalidRequestError,
  CrmAccountabilityListV2NotFoundError,
  hasNewerCrmAccountabilityV2,
  listCrmAccountabilityPageV2,
  resolveAccessibleProjectForAccountabilityListV2,
} from '@/infrastructure/crm/server/accountabilityListV2/accountabilityListV2Service';
import {
  crmAccountabilityListV2InvalidCursorResponse,
} from '@/infrastructure/crm/server/accountabilityListV2/accountabilityListCursorCodec';
import { logCrmAccountabilityListV2Event } from '@/infrastructure/crm/server/accountabilityListV2/accountabilityListV2Observability';

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

  const projectSlug = context.params.slug?.trim();
  if (!projectSlug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const project = await resolveAccessibleProjectForAccountabilityListV2(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      projectSlug
    );

    const params = request.nextUrl.searchParams;

    // Lightweight newer-activity probe (no page payload).
    if (params.get('probe') === 'newer') {
      const afterCreatedAt = params.get('afterCreatedAt')?.trim() ?? '';
      const afterId = params.get('afterId')?.trim() ?? '';
      if (!afterCreatedAt || !afterId) {
        return NextResponse.json(
          { error: 'invalid_request', message: 'afterCreatedAt and afterId are required' },
          { status: 400 }
        );
      }
      const hasNewer = await hasNewerCrmAccountabilityV2({
        supabase: auth.context.supabase,
        organizationId: auth.context.organizationId,
        projectId: project.id,
        afterCreatedAt,
        afterId,
      });
      return NextResponse.json(
        { hasNewer },
        {
          headers: {
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const normalized = normalizeCrmAccountabilityListV2Request({
      projectId: project.id,
      search: params.get('search'),
      limit: params.get('limit') ?? undefined,
    });
    if (!normalized.ok) {
      return NextResponse.json(
        { error: 'invalid_request', message: normalized.message },
        { status: 400 }
      );
    }

    const cursorRaw = params.get('cursor');
    const cursor =
      cursorRaw != null && cursorRaw.trim() !== '' ? cursorRaw.trim() : null;

    const page = await listCrmAccountabilityPageV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      projectId: project.id,
      request: normalized.request,
      cursor,
    });

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    if (err instanceof CrmAccountabilityListV2InvalidCursorError) {
      logCrmAccountabilityListV2Event({
        name: 'crm.accountability_list_v2.cursor_invalid',
        category: 'malformed',
      });
      const invalid = crmAccountabilityListV2InvalidCursorResponse();
      return NextResponse.json(invalid.body, { status: invalid.status });
    }
    if (err instanceof CrmAccountabilityListV2ForbiddenError) {
      logCrmAccountabilityListV2Event({
        name: 'crm.accountability_list_v2.auth_failure',
        code: 'member_hidden',
      });
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    if (err instanceof CrmAccountabilityListV2NotFoundError) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    if (err instanceof CrmAccountabilityListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmAccountabilityListV2Event({
      name: 'crm.accountability_list_v2.db_failure',
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to load Accountability v2');
  }
}
