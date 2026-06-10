import { NextRequest, NextResponse } from 'next/server';
import { relayCustomerTaskPortalSubmit } from '@/infrastructure/crm/server/customerTaskPortalRelay';

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
    body = {};
  }

  const responseText =
    body != null && typeof body === 'object' && 'responseText' in body
      ? typeof (body as { responseText?: unknown }).responseText === 'string'
        ? (body as { responseText: string }).responseText
        : null
      : null;

  return relayCustomerTaskPortalSubmit(token, responseText);
}
