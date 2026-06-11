import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerPortalDirectUploadFinalize } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { token: string; documentId: string } };

export async function POST(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = context.params.token?.trim();
  const documentId = context.params.documentId?.trim();
  if (!token || !documentId) {
    return NextResponse.json({ error: 'validation_error', message: 'Document not found.' }, { status: 400 });
  }

  return relayCustomerPortalDirectUploadFinalize(token, documentId);
}
