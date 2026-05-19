/**
 * GET /api/crm/projects/[slug]/tasks/[taskId]/documents/[documentId]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { createWorkflowTaskDocumentDownloadForOrg } from '@/infrastructure/crm/server/crmDocumentService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; taskId: string; documentId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const taskId = context.params.taskId?.trim();
  const documentId = context.params.documentId?.trim();
  if (!slug || !taskId || !documentId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  try {
    const download = await createWorkflowTaskDocumentDownloadForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      { projectSlug: slug, workflowTaskId: taskId, documentId }
    );
    return NextResponse.json(download);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
