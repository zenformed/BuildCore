/**
 * GET  /api/crm/projects/[slug]/budget-entries/[entryId]/documents — list budget entry documents
 * POST /api/crm/projects/[slug]/budget-entries/[entryId]/documents — upload document (multipart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  listBudgetEntryDocumentsForOrg,
  uploadBudgetEntryDocumentForOrg,
} from '@/infrastructure/crm/server/crmBudgetEntryDocumentService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; entryId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const entryId = context.params.entryId?.trim();
  if (!slug || !entryId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  try {
    const documents = await listBudgetEntryDocumentsForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { projectSlug: slug, budgetEntryId: entryId }
    );
    return NextResponse.json({ documents });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const entryId = context.params.entryId?.trim();
  if (!slug || !entryId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Multipart form data required' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Missing file field' },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const document = await uploadBudgetEntryDocumentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      {
        projectSlug: slug,
        budgetEntryId: entryId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        body: buffer,
      }
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
