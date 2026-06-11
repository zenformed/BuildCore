/**
 * GET /api/crm/projects/[slug]/media/[documentId]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { resolveProjectMediaDocumentAttachmentForOrg } from '@/infrastructure/crm/server/crmDocumentService';
import { crmDocumentAttachmentNextResponse } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
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

  try {
    const attachment = await resolveProjectMediaDocumentAttachmentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      { projectSlug: slug, documentId }
    );
    return crmDocumentAttachmentNextResponse(attachment);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
