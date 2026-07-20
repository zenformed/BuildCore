/**
 * POST /api/crm/projects/[slug]/documents/download
 * Body: { documentIds: string[] }
 * Returns one file or a ZIP of the selected project/subproject documents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { crmDocumentAttachmentNextResponse } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { buildCrmProjectDocumentsBulkDownloadForOrg } from '@/infrastructure/crm/server/crmProjectDocumentsBulkDownload';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

function parseDocumentIds(body: unknown): string[] | null {
  if (body == null || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.documentIds)) return null;
  const ids = record.documentIds.filter((id): id is string => typeof id === 'string');
  return ids.length === record.documentIds.length ? ids : null;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be JSON' },
      { status: 400 }
    );
  }

  const documentIds = parseDocumentIds(body);
  if (documentIds == null || documentIds.length === 0) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'documentIds must be a non-empty string array' },
      { status: 400 }
    );
  }

  try {
    const attachment = await buildCrmProjectDocumentsBulkDownloadForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      { projectSlug: slug, documentIds }
    );
    return crmDocumentAttachmentNextResponse(attachment);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
