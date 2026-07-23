import { NextResponse } from 'next/server';
import {
  finalizeBuildCoreDirectUploadBatchOnCore,
  finalizeBuildCoreDirectUploadOnCore,
  finalizeCustomerPortalDirectUploadBatchOnCore,
  finalizeCustomerPortalDirectUploadOnCore,
  prepareBuildCoreDirectUploadBatchOnCore,
  prepareCustomerPortalDirectUploadBatchOnCore,
  prepareCustomerPortalDirectUploadOnCore,
  type FinalizeDirectUploadBatchItem,
  type PrepareDirectUploadBatchPayload,
  type PrepareDirectUploadPayload,
} from '@/infrastructure/coreApi/buildCoreDirectUploadClient';
import { customerTaskPortalCoreErrorMessage } from '@/infrastructure/coreApi/buildCoreCustomerTaskPortalClient';

function coreUnavailable(): NextResponse {
  return NextResponse.json(
    { error: 'misconfigured', message: 'Direct upload requires ZenformedCore configuration.' },
    { status: 503 }
  );
}

function extractCoreError(error: {
  kind: string;
  status?: number;
  body?: unknown;
}): { code: string; message: string; status: number } {
  const status = error.kind === 'http_error' && error.status != null ? error.status : 502;
  if (error.body != null && typeof error.body === 'object') {
    const body = error.body as Record<string, unknown>;
    const code = typeof body.error === 'string' ? body.error : 'server_error';
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : customerTaskPortalCoreErrorMessage(error as never);
    return { code, message, status };
  }
  return {
    code: 'server_error',
    message: customerTaskPortalCoreErrorMessage(error as never),
    status,
  };
}

function mapCoreResultError(error: {
  kind: string;
  status?: number;
  body?: unknown;
  message?: string;
}): NextResponse {
  if (error.kind === 'unconfigured') return coreUnavailable();
  if (error.kind === 'http_error') {
    const mapped = extractCoreError(error);
    return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
  }
  return NextResponse.json(
    { error: 'server_error', message: customerTaskPortalCoreErrorMessage(error as never) },
    { status: 502 }
  );
}

export async function relayCrmDirectUploadPrepare(
  accessToken: string,
  organizationId: string,
  payload: PrepareDirectUploadPayload | PrepareDirectUploadBatchPayload
): Promise<NextResponse> {
  const batchPayload: PrepareDirectUploadBatchPayload =
    'files' in payload && Array.isArray(payload.files)
      ? payload
      : {
          ...(payload as PrepareDirectUploadPayload),
          files: [
            {
              clientFileId: 'file-1',
              fileName: (payload as PrepareDirectUploadPayload).fileName,
              mimeType: (payload as PrepareDirectUploadPayload).mimeType,
              sizeBytes: (payload as PrepareDirectUploadPayload).sizeBytes,
              latitude: (payload as PrepareDirectUploadPayload).latitude,
              longitude: (payload as PrepareDirectUploadPayload).longitude,
              locationAccuracyMeters: (payload as PrepareDirectUploadPayload)
                .locationAccuracyMeters,
              locationSource: (payload as PrepareDirectUploadPayload).locationSource,
              locationCapturedAt: (payload as PrepareDirectUploadPayload).locationCapturedAt,
            },
          ],
        };

  const result = await prepareBuildCoreDirectUploadBatchOnCore(
    accessToken,
    organizationId,
    batchPayload
  );
  if (!result.ok) return mapCoreResultError(result.error);

  // Preserve legacy single-file response shape when caller sent a single-file body.
  if (!('files' in payload)) {
    const first = result.data.uploads[0];
    if (first == null) {
      return NextResponse.json(
        { error: 'server_error', message: 'Could not prepare upload.' },
        { status: 502 }
      );
    }
    return NextResponse.json({
      documentId: first.documentId,
      uploadUrl: first.uploadUrl,
      uploadToken: first.uploadToken,
      storageBucket: first.storageBucket,
      storageKey: first.storageKey,
      mimeType: first.mimeType,
    });
  }

  return NextResponse.json(result.data);
}

export async function relayCrmDirectUploadFinalizeBatch(
  accessToken: string,
  organizationId: string,
  uploads: readonly FinalizeDirectUploadBatchItem[]
): Promise<NextResponse> {
  const result = await finalizeBuildCoreDirectUploadBatchOnCore(
    accessToken,
    organizationId,
    uploads
  );
  if (!result.ok) return mapCoreResultError(result.error);
  return NextResponse.json(result.data);
}

export async function relayCrmDirectUploadFinalize(
  accessToken: string,
  organizationId: string,
  documentId: string
): Promise<NextResponse> {
  const result = await finalizeBuildCoreDirectUploadOnCore(accessToken, organizationId, documentId);
  if (!result.ok) return mapCoreResultError(result.error);
  return NextResponse.json(result.data);
}

export async function relayCustomerPortalDirectUploadPrepare(
  token: string,
  payload:
    | { fileName: string; mimeType: string; sizeBytes: number }
    | {
        files: readonly {
          clientFileId: string;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
        }[];
      }
): Promise<NextResponse> {
  if ('files' in payload) {
    const result = await prepareCustomerPortalDirectUploadBatchOnCore(token, payload.files);
    if (!result.ok) return mapCoreResultError(result.error);
    return NextResponse.json(result.data);
  }

  const result = await prepareCustomerPortalDirectUploadOnCore(token, payload);
  if (!result.ok) return mapCoreResultError(result.error);
  return NextResponse.json(result.data);
}

export async function relayCustomerPortalDirectUploadFinalizeBatch(
  token: string,
  uploads: readonly FinalizeDirectUploadBatchItem[]
): Promise<NextResponse> {
  const result = await finalizeCustomerPortalDirectUploadBatchOnCore(token, uploads);
  if (!result.ok) return mapCoreResultError(result.error);
  return NextResponse.json(result.data);
}

export async function relayCustomerPortalDirectUploadFinalize(
  token: string,
  documentId: string
): Promise<NextResponse> {
  const result = await finalizeCustomerPortalDirectUploadOnCore(token, documentId);
  if (!result.ok) return mapCoreResultError(result.error);
  return NextResponse.json(result.data);
}
