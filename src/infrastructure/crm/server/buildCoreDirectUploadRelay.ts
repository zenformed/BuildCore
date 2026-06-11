import { NextResponse } from 'next/server';
import {
  finalizeBuildCoreDirectUploadOnCore,
  prepareBuildCoreDirectUploadOnCore,
  type PrepareDirectUploadPayload,
} from '@/infrastructure/coreApi/buildCoreDirectUploadClient';
import { customerTaskPortalCoreErrorMessage } from '@/infrastructure/coreApi/buildCoreCustomerTaskPortalClient';
import {
  finalizeCustomerPortalDirectUploadOnCore,
  prepareCustomerPortalDirectUploadOnCore,
} from '@/infrastructure/coreApi/buildCoreDirectUploadClient';

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

export async function relayCrmDirectUploadPrepare(
  accessToken: string,
  organizationId: string,
  payload: PrepareDirectUploadPayload
): Promise<NextResponse> {
  const result = await prepareBuildCoreDirectUploadOnCore(accessToken, organizationId, payload);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreError(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data);
}

export async function relayCrmDirectUploadFinalize(
  accessToken: string,
  organizationId: string,
  documentId: string
): Promise<NextResponse> {
  const result = await finalizeBuildCoreDirectUploadOnCore(accessToken, organizationId, documentId);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreError(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data);
}

export async function relayCustomerPortalDirectUploadPrepare(
  token: string,
  payload: { fileName: string; mimeType: string; sizeBytes: number }
): Promise<NextResponse> {
  const result = await prepareCustomerPortalDirectUploadOnCore(token, payload);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreError(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data);
}

export async function relayCustomerPortalDirectUploadFinalize(
  token: string,
  documentId: string
): Promise<NextResponse> {
  const result = await finalizeCustomerPortalDirectUploadOnCore(token, documentId);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreError(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data);
}
