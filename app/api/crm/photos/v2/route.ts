/**
 * GET /api/crm/photos/v2
 * Organization-wide Photos keyset page (infinite scroll).
 * Behind BUILDCORE_PHOTOS_LIST_V2 / org allowlist. No v1 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeCrmPhotosListV2Request } from '@/domain/crm/photosListV2';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertPhotosListV2EnabledForOrganization } from '@/infrastructure/crm/server/photosListV2/photosListV2FeatureGate';
import {
  CrmPhotosListV2InvalidCursorError,
  CrmPhotosListV2InvalidRequestError,
  hasNewerCrmPhotosV2,
  listCrmPhotosPageV2,
} from '@/infrastructure/crm/server/photosListV2/photosListV2Service';
import { crmPhotosListV2InvalidCursorResponse } from '@/infrastructure/crm/server/photosListV2/photosListCursorCodec';
import { logCrmPhotosListV2Event } from '@/infrastructure/crm/server/photosListV2/photosListV2Observability';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const disabled = assertPhotosListV2EnabledForOrganization(auth.context.organizationId);
  if (disabled != null) return disabled;

  try {
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
      const hasNewer = await hasNewerCrmPhotosV2({
        supabase: auth.context.supabase,
        organizationId: auth.context.organizationId,
        userId: auth.context.user.id,
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

    const normalized = normalizeCrmPhotosListV2Request({
      organizationId: auth.context.organizationId,
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

    const page = await listCrmPhotosPageV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      request: normalized.request,
      cursor,
    });

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    if (err instanceof CrmPhotosListV2InvalidCursorError) {
      logCrmPhotosListV2Event({
        name: 'crm.photos_list_v2.cursor_invalid',
        category: 'malformed',
      });
      const invalid = crmPhotosListV2InvalidCursorResponse();
      return NextResponse.json(invalid.body, { status: invalid.status });
    }
    if (err instanceof CrmPhotosListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmPhotosListV2Event({
      name: 'crm.photos_list_v2.db_failure',
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to load Photos v2');
  }
}
