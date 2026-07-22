import { NextRequest, NextResponse } from 'next/server';
import { parseDocumentCaptureLocationPayload } from '@/domain/crm/documentCaptureLocation';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  requireBuildCoreWorkflowTaskPermission,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { relayCrmDirectUploadPrepare } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';
import type { PrepareDirectUploadPayload } from '@/infrastructure/coreApi/buildCoreDirectUploadClient';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const scope = record.scope;
  if (scope !== 'workflow_task' && scope !== 'budget_entry' && scope !== 'project_media') {
    return NextResponse.json({ error: 'validation_error', message: 'Invalid upload scope.' }, { status: 400 });
  }

  if (scope === 'workflow_task') {
    const permission = await requireBuildCoreWorkflowTaskPermission(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      (flags) => flags.canUpload,
      'You do not have permission to upload workflow task documents.'
    );
    if (!permission.ok) return permission.response;
  }

  if (scope === 'workflow_task' && typeof record.workflowTaskId !== 'string') {
    return NextResponse.json({ error: 'validation_error', message: 'workflowTaskId is required.' }, { status: 400 });
  }
  if (scope === 'budget_entry' && typeof record.budgetEntryId !== 'string') {
    return NextResponse.json({ error: 'validation_error', message: 'budgetEntryId is required.' }, { status: 400 });
  }

  const fileName = typeof record.fileName === 'string' ? record.fileName : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream';
  const sizeBytes = typeof record.sizeBytes === 'number' ? record.sizeBytes : Number(record.sizeBytes);

  if (!fileName.trim() || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: 'validation_error', message: 'Invalid upload request.' }, { status: 400 });
  }

  let location;
  try {
    location = parseDocumentCaptureLocationPayload(record);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: err instanceof Error ? err.message : 'Invalid capture location.',
      },
      { status: 400 }
    );
  }

  const locationFields =
    location == null
      ? {}
      : {
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracyMeters: location.locationAccuracyMeters,
          locationSource: location.locationSource,
          locationCapturedAt: location.locationCapturedAt,
        };

  let payload: PrepareDirectUploadPayload;
  if (scope === 'workflow_task') {
    payload = {
      scope,
      projectSlug: slug,
      workflowTaskId: record.workflowTaskId as string,
      fileName,
      mimeType,
      sizeBytes,
      ...locationFields,
    };
  } else if (scope === 'budget_entry') {
    payload = {
      scope,
      projectSlug: slug,
      budgetEntryId: record.budgetEntryId as string,
      fileName,
      mimeType,
      sizeBytes,
      ...locationFields,
    };
  } else {
    payload = { scope, projectSlug: slug, fileName, mimeType, sizeBytes, ...locationFields };
  }

  const accessToken = auth.context.authHeader.replace(/^Bearer\s+/i, '').trim();
  return relayCrmDirectUploadPrepare(accessToken, auth.context.organizationId, payload);
}
