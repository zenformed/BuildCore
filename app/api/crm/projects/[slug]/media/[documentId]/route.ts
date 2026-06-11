/**
 * DELETE /api/crm/projects/[slug]/media/[documentId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { deleteProjectMediaDocumentForOrg } from '@/infrastructure/crm/server/crmDocumentService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; documentId: string } };

export async function DELETE(
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
    await deleteProjectMediaDocumentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      { projectSlug: slug, documentId }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
