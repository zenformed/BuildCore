import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerTaskPortalUpload } from '@/infrastructure/crm/server/customerTaskPortalRelay';

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Multipart form data required.' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Missing file field.' },
      { status: 400 }
    );
  }

  return relayCustomerTaskPortalUpload(token, file);
}
