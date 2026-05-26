/**
 * GET  /api/crm/projects/[slug]/tasks/[taskId]/documents — list task documents
 * POST /api/crm/projects/[slug]/tasks/[taskId]/documents — upload document (multipart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  listWorkflowTaskDocumentsForOrg,
  uploadWorkflowTaskDocumentForOrg,
} from '@/infrastructure/crm/server/crmDocumentService';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';
import {
  requireBuildCoreWorkflowTaskPermission,
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionForbiddenResponse,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; taskId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const taskId = context.params.taskId?.trim();
  if (!slug || !taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  try {
    const access = await resolveBuildCoreWorkflowTaskAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    if (!access.canView) {
      return workflowTaskPermissionForbiddenResponse(
        'You do not have permission to view workflow tasks.'
      );
    }

    const documents = await listWorkflowTaskDocumentsForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { projectSlug: slug, workflowTaskId: taskId }
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
  const taskId = context.params.taskId?.trim();
  if (!slug || !taskId) {
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
    const permission = await requireBuildCoreWorkflowTaskPermission(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      (flags) => flags.canUpload,
      'You do not have permission to upload workflow task documents.'
    );
    if (!permission.ok) return permission.response;

    const buffer = await file.arrayBuffer();
    const document = await uploadWorkflowTaskDocumentForOrg(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      {
        projectSlug: slug,
        workflowTaskId: taskId,
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
