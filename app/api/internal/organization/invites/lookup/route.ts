import { NextRequest, NextResponse } from 'next/server';

import { lookupOrganizationInvite } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import { relayOrganizationPublicGet } from '../../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (token == null || token === '') {
    return NextResponse.json(
      { error: 'invalid_query', message: 'token query parameter is required.' },
      { status: 400 }
    );
  }

  return relayOrganizationPublicGet(() => lookupOrganizationInvite(token));
}
