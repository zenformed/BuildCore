import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerPortalDirectUploadPrepare } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = context.params.token?.trim();
  if (!token) {
    return NextResponse.json({ error: 'invalid_token', message: 'This link is invalid.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const fileName = typeof record.fileName === 'string' ? record.fileName : '';
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream';
  const sizeBytes = typeof record.sizeBytes === 'number' ? record.sizeBytes : Number(record.sizeBytes);

  if (!fileName.trim() || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: 'validation_error', message: 'Invalid upload request.' }, { status: 400 });
  }

  return relayCustomerPortalDirectUploadPrepare(token, { fileName, mimeType, sizeBytes });
}
