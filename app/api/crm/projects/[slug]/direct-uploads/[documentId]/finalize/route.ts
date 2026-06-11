import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { relayCrmDirectUploadFinalize } from '@/infrastructure/crm/server/buildCoreDirectUploadRelay';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; documentId: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const documentId = context.params.documentId?.trim();
  if (!documentId) {
    return NextResponse.json({ error: 'validation_error', message: 'Document not found.' }, { status: 400 });
  }

  const accessToken = auth.context.authHeader.replace(/^Bearer\s+/i, '').trim();
  return relayCrmDirectUploadFinalize(accessToken, auth.context.organizationId, documentId);
}
