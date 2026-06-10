import { NextResponse } from 'next/server';
import {
  customerTaskPortalCoreErrorMessage,
  deleteBuildCoreCustomerTaskPortalDocumentFromCore,
  getBuildCoreCustomerTaskPortalFromCore,
  submitBuildCoreCustomerTaskPortalToCore,
  uploadBuildCoreCustomerTaskPortalDocumentToCore,
} from '@/infrastructure/coreApi/buildCoreCustomerTaskPortalClient';
import type { CustomerTaskPortalView } from '@/domain/crm/customerTaskRequest';

function coreUnavailable(): NextResponse {
  return NextResponse.json(
    { error: 'misconfigured', message: 'Customer portal requires ZenformedCore configuration.' },
    { status: 503 }
  );
}

function extractCoreErrorBody(error: {
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

export function customerTaskRequestErrorResponse(error: unknown): NextResponse {
  if (error != null && typeof error === 'object' && 'kind' in error) {
    const mapped = extractCoreErrorBody(error as { kind: string; status?: number; body?: unknown });
    return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
  }
  return NextResponse.json({ error: 'server_error', message: 'Unexpected error.' }, { status: 500 });
}

export async function relayCustomerTaskPortalView(token: string): Promise<NextResponse> {
  const result = await getBuildCoreCustomerTaskPortalFromCore(token);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreErrorBody(result.error);
      const portal: CustomerTaskPortalView =
        mapped.status === 404
          ? {
              state: 'invalid',
              organizationName: '',
              projectName: '',
              taskTitle: '',
              taskInstructions: null,
              canSubmit: false,
              uploadedFiles: [],
            }
          : {
              state: 'invalid',
              organizationName: '',
              projectName: '',
              taskTitle: '',
              taskInstructions: null,
              canSubmit: false,
              uploadedFiles: [],
            };
      if (mapped.status === 404) {
        return NextResponse.json({ portal });
      }
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json({ portal: result.data.portal });
}

export async function relayCustomerTaskPortalUpload(token: string, file: File): Promise<NextResponse> {
  const result = await uploadBuildCoreCustomerTaskPortalDocumentToCore(token, file);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreErrorBody(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data, { status: 201 });
}

export async function relayCustomerTaskPortalDocumentDelete(
  token: string,
  documentId: string
): Promise<NextResponse> {
  const result = await deleteBuildCoreCustomerTaskPortalDocumentFromCore(token, documentId);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreErrorBody(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function relayCustomerTaskPortalSubmit(
  token: string,
  responseText: string | null
): Promise<NextResponse> {
  const result = await submitBuildCoreCustomerTaskPortalToCore(token, responseText);
  if (!result.ok) {
    if (result.error.kind === 'unconfigured') return coreUnavailable();
    if (result.error.kind === 'http_error') {
      const mapped = extractCoreErrorBody(result.error);
      return NextResponse.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(
      { error: 'server_error', message: customerTaskPortalCoreErrorMessage(result.error) },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
