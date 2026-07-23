import { NextRequest, NextResponse } from 'next/server';
import { parseDocumentCaptureLocationPayload } from '@/domain/crm/documentCaptureLocation';
import { BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH } from '@/domain/crm/buildCoreUploadPolicy';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreWorkflowTaskPermission } from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { relayCrmDirectUploadPrepare } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';
import type {
  PrepareDirectUploadBatchPayload,
  PrepareDirectUploadFilePayload,
} from '@/infrastructure/coreApi/buildCoreDirectUploadClient';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

function parseFilePayload(
  record: Record<string, unknown>,
  fallbackClientFileId: string
): PrepareDirectUploadFilePayload {
  const clientFileId =
    typeof record.clientFileId === 'string' && record.clientFileId.trim()
      ? record.clientFileId.trim()
      : fallbackClientFileId;
  const fileName = typeof record.fileName === 'string' ? record.fileName : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream';
  const sizeBytes = typeof record.sizeBytes === 'number' ? record.sizeBytes : Number(record.sizeBytes);
  const location = parseDocumentCaptureLocationPayload(record);
  return {
    clientFileId,
    fileName,
    mimeType,
    sizeBytes,
    ...(location == null
      ? {}
      : {
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracyMeters: location.locationAccuracyMeters,
          locationSource: location.locationSource,
          locationCapturedAt: location.locationCapturedAt,
        }),
  };
}

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

  let files: PrepareDirectUploadFilePayload[];
  try {
    if (Array.isArray(record.files)) {
      files = record.files.map((entry, index) =>
        parseFilePayload((entry ?? {}) as Record<string, unknown>, `file-${index + 1}`)
      );
    } else {
      files = [parseFilePayload(record, 'file-1')];
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: err instanceof Error ? err.message : 'Invalid capture location.',
      },
      { status: 400 }
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'validation_error', message: 'At least one file is required.' },
      { status: 400 }
    );
  }
  if (files.length > BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `You can upload at most ${BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH} files at once.`,
      },
      { status: 400 }
    );
  }

  if (
    files.some(
      (file) => !file.fileName.trim() || !Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0
    )
  ) {
    return NextResponse.json({ error: 'validation_error', message: 'Invalid upload request.' }, { status: 400 });
  }

  let payload: PrepareDirectUploadBatchPayload;
  if (scope === 'workflow_task') {
    payload = {
      scope,
      projectSlug: slug,
      workflowTaskId: record.workflowTaskId as string,
      files,
    };
  } else if (scope === 'budget_entry') {
    payload = {
      scope,
      projectSlug: slug,
      budgetEntryId: record.budgetEntryId as string,
      files,
    };
  } else {
    payload = { scope, projectSlug: slug, files };
  }

  const accessToken = auth.context.authHeader.replace(/^Bearer\s+/i, '').trim();
  // When callers still send legacy single-file fields (no files[]), relay returns legacy shape.
  if (!Array.isArray(record.files) && files.length === 1) {
    const file = files[0];
    return relayCrmDirectUploadPrepare(accessToken, auth.context.organizationId, {
      ...payload,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      latitude: file.latitude,
      longitude: file.longitude,
      locationAccuracyMeters: file.locationAccuracyMeters,
      locationSource: file.locationSource,
      locationCapturedAt: file.locationCapturedAt,
    });
  }

  return relayCrmDirectUploadPrepare(accessToken, auth.context.organizationId, payload);
}
