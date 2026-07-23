import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { relayCrmDirectUploadFinalizeBatch } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';
import type { FinalizeDirectUploadBatchItem } from '@/infrastructure/coreApi/buildCoreDirectUploadClient';

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

  const accessToken = auth.context.authHeader.replace(/^Bearer\s+/i, '').trim();
  return relayCrmDirectUploadFinalizeBatch(accessToken, auth.context.organizationId, uploads);
}
