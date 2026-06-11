/**
 * GET /api/crm/projects/[slug]/budget-entries/[entryId]/documents/[documentId]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { resolveBudgetEntryDocumentAttachmentForOrg } from '@/infrastructure/crm/server/crmBudgetEntryDocumentService';
import { crmDocumentAttachmentNextResponse } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; entryId: string; documentId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const entryId = context.params.entryId?.trim();
  const documentId = context.params.documentId?.trim();
  if (!slug || !entryId || !documentId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  try {
    const attachment = await resolveBudgetEntryDocumentAttachmentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      { projectSlug: slug, budgetEntryId: entryId, documentId }
    );
    return crmDocumentAttachmentNextResponse(attachment);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
