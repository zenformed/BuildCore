import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerPortalDirectUploadFinalizeBatch } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';
import type { FinalizeDirectUploadBatchItem } from '@/infrastructure/coreApi/buildCoreDirectUploadClient';

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
  if (!Array.isArray(record.uploads)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'uploads array is required.' },
      { status: 400 }
    );
  }

  const uploads: FinalizeDirectUploadBatchItem[] = record.uploads.map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    return {
      clientFileId:
        typeof item.clientFileId === 'string' && item.clientFileId.trim()
          ? item.clientFileId.trim()
          : `file-${index + 1}`,
      documentId: typeof item.documentId === 'string' ? item.documentId : '',
      success: item.success === true,
      errorCode: typeof item.errorCode === 'string' ? item.errorCode : undefined,
    };
  });

  return relayCustomerPortalDirectUploadFinalizeBatch(token, uploads);
}
