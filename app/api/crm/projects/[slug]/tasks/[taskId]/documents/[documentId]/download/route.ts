/**
 * GET /api/crm/projects/[slug]/tasks/[taskId]/documents/[documentId]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  requireBuildCoreDownloadPermission,
  resolveWorkflowTaskDocumentDownloadPermissionDomain,
} from '@/infrastructure/crm/server/buildCoreDownloadPermissionService';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import { resolveWorkflowTaskDocumentAttachmentForOrg } from '@/infrastructure/crm/server/crmDocumentService';
import { crmDocumentAttachmentNextResponse } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
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

  const permissionDomain = await resolveWorkflowTaskDocumentDownloadPermissionDomain(
    auth.context.supabase,
    auth.context.organizationId,
    slug,
    taskId
  );
  const downloadPermission = await requireBuildCoreDownloadPermission(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    permissionDomain
  );
  if (!downloadPermission.ok) {
    return downloadPermission.response;
  }

  try {
    const attachment = await resolveWorkflowTaskDocumentAttachmentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      { projectSlug: slug, workflowTaskId: taskId, documentId }
    );
    return crmDocumentAttachmentNextResponse(attachment);
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}
