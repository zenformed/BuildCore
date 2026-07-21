import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { crmDocumentAttachmentNextResponse } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';
import { buildCrmOrganizationPhotosBulkDownloadForViewer } from '@/infrastructure/crm/server/crmOrganizationPhotosBulkDownload';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const ids =
    body != null &&
    typeof body === 'object' &&
    Array.isArray((body as { documentIds?: unknown }).documentIds)
      ? (body as { documentIds: unknown[] }).documentIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'documentIds must be a non-empty array' },
      { status: 400 }
    );
  }

  try {
    const attachment = await buildCrmOrganizationPhotosBulkDownloadForViewer(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      ids
    );
    return crmDocumentAttachmentNextResponse(attachment);
  } catch (error) {
    return crmDocumentErrorResponse(error);
  }
}
