/**
 * GET /api/crm/projects/[slug]/documents/v2
 * Project-scoped Documents keyset page (Load More).
 * Behind BUILDCORE_DOCUMENTS_LIST_V2 / org allowlist. No v1 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeCrmDocumentsListV2Request } from '@/domain/crm/documentsListV2';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertDocumentsListV2EnabledForOrganization } from '@/infrastructure/crm/server/documentsListV2/documentsListV2FeatureGate';
import {
  CrmDocumentsListV2InvalidCursorError,
  CrmDocumentsListV2InvalidRequestError,
  CrmDocumentsListV2NotFoundError,
  hasNewerCrmDocumentsV2,
  listCrmDocumentsPageV2,
  resolveAccessibleProjectForDocumentsListV2,
} from '@/infrastructure/crm/server/documentsListV2/documentsListV2Service';
import { crmDocumentsListV2InvalidCursorResponse } from '@/infrastructure/crm/server/documentsListV2/documentsListCursorCodec';
import { logCrmDocumentsListV2Event } from '@/infrastructure/crm/server/documentsListV2/documentsListV2Observability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const disabled = assertDocumentsListV2EnabledForOrganization(auth.context.organizationId);
  if (disabled != null) return disabled;

  const projectSlug = context.params.slug?.trim();
  if (!projectSlug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const project = await resolveAccessibleProjectForDocumentsListV2(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      projectSlug
    );

    const params = request.nextUrl.searchParams;

    if (params.get('probe') === 'newer') {
      const afterCreatedAt = params.get('afterCreatedAt')?.trim() ?? '';
      const afterId = params.get('afterId')?.trim() ?? '';
      if (!afterCreatedAt || !afterId) {
        return NextResponse.json(
          { error: 'invalid_request', message: 'afterCreatedAt and afterId are required' },
          { status: 400 }
        );
      }
      const hasNewer = await hasNewerCrmDocumentsV2({
        supabase: auth.context.supabase,
        organizationId: auth.context.organizationId,
        userId: auth.context.user.id,
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

    const normalized = normalizeCrmDocumentsListV2Request({
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

    const page = await listCrmDocumentsPageV2({
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
    if (err instanceof CrmDocumentsListV2InvalidCursorError) {
      logCrmDocumentsListV2Event({
        name: 'crm.documents_list_v2.cursor_invalid',
        category: 'malformed',
      });
      const invalid = crmDocumentsListV2InvalidCursorResponse();
      return NextResponse.json(invalid.body, { status: invalid.status });
    }
    if (err instanceof CrmDocumentsListV2NotFoundError) {
      logCrmDocumentsListV2Event({
        name: 'crm.documents_list_v2.auth_failure',
        code: 'not_found',
      });
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    if (err instanceof CrmDocumentsListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmDocumentsListV2Event({
      name: 'crm.documents_list_v2.db_failure',
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to load Documents v2');
  }
}
