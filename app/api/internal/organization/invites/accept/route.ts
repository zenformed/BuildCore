import { NextRequest, NextResponse } from 'next/server';

import { acceptOrganizationInvite } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import { relayOrganizationMutate } from '../../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected JSON object' }, { status: 400 });
  }

  const token = (body as Record<string, unknown>).token;
  if (typeof token !== 'string' || token.trim() === '') {
    return NextResponse.json({ error: 'invalid_body', message: 'token is required' }, { status: 400 });
  }

  return relayOrganizationMutate(
    request,
    (accessToken) => acceptOrganizationInvite(accessToken, { token }),
    { rejectedError: 'invite_accept_rejected' }
  );
}
