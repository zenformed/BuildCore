/**
 * GET /api/crm/projects/[slug]/documents/[documentId]/browse
 *
 * Returns a short-lived signed Storage URL for authorized CRM media browsing.
 * Does not stream file bytes through BuildCore.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseCrmMediaBrowseVariant,
  type CrmMediaBrowseSourceResponse,
} from '@/domain/crm/mediaBrowse';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { createAuthorizedCrmMediaBrowseSource } from '@/infrastructure/crm/server/crmMediaBrowseUrlService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; documentId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const documentId = context.params.documentId?.trim();
  if (!slug || !documentId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  const preferredVariant = parseCrmMediaBrowseVariant(
    request.nextUrl.searchParams.get('variant')
  );

  try {
    const result = await createAuthorizedCrmMediaBrowseSource({
      supabase: auth.context.supabase,
      storage: getDocumentStorageProviderForCrmAuth(auth.context),
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      projectSlug: slug,
      documentId,
      preferredVariant,
    });
    if (!result.ok) return result.response;

    const body: CrmMediaBrowseSourceResponse = { source: result.source };
    return NextResponse.json(body, {
      status: 200,
      headers: {
        // Signed URL JSON is user-specific and short-lived — do not cache at shared edges.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
