/**
 * DELETE /api/crm/projects/[slug]/tasks/[taskId]/documents/[documentId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { deleteWorkflowTaskDocumentForOrg } from '@/infrastructure/crm/server/crmDocumentService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';
import { requireBuildCoreWorkflowTaskPermission } from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; taskId: string; documentId: string } };

export async function DELETE(
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
    const permission = await requireBuildCoreWorkflowTaskPermission(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      (flags) => flags.canEdit,
      'You do not have permission to edit workflow tasks.'
    );
    if (!permission.ok) return permission.response;

    await deleteWorkflowTaskDocumentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      { projectSlug: slug, workflowTaskId: taskId, documentId }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
