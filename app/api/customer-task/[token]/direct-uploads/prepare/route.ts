import { NextRequest, NextResponse } from 'next/server';
import { BUILDCORE_UPLOAD_MAX_FILES_PER_BATCH } from '@/domain/crm/buildCoreUploadPolicy';
import { relayCustomerPortalDirectUploadPrepare } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string } };

type PortalPrepareFile = {
  clientFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function parseFile(
  record: Record<string, unknown>,
  fallbackClientFileId: string
): PortalPrepareFile {
  return {
    clientFileId:
      typeof record.clientFileId === 'string' && record.clientFileId.trim()
        ? record.clientFileId.trim()
        : fallbackClientFileId,
    fileName: typeof record.fileName === 'string' ? record.fileName : '',
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream',
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : Number(record.sizeBytes),
  };
}

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
  let files: PortalPrepareFile[];
  if (Array.isArray(record.files)) {
    files = record.files.map((entry, index) =>
      parseFile((entry ?? {}) as Record<string, unknown>, `file-${index + 1}`)
    );
  } else {
    files = [parseFile(record, 'file-1')];
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

  if (!Array.isArray(record.files) && files.length === 1) {
    return relayCustomerPortalDirectUploadPrepare(token, files[0]);
  }

  return relayCustomerPortalDirectUploadPrepare(token, { files });
}
