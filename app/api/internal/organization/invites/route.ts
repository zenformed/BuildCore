import { NextRequest, NextResponse } from 'next/server';

import {

  getOrganizationInvites,

  postOrganizationInvite,

} from '@/infrastructure/coreApi/organizationWorkspaceClient';

import type { ZenformedCoreOrganizationInviteCreateRequest } from '@/infrastructure/coreApi/types';

import { relayOrganizationGet, relayOrganizationMutate } from '../coreOrganizationRelay';



export const dynamic = 'force-dynamic';



export async function GET(request: NextRequest) {

  return relayOrganizationGet(request, getOrganizationInvites);

}



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

  const payload = body as ZenformedCoreOrganizationInviteCreateRequest;

  return relayOrganizationMutate(

    request,

    (token) => postOrganizationInvite(token, payload),

    {
      rejectedError: 'invite_create_rejected',
      successStatus: 201,
      requiredPermission: 'canInviteMembers',
    }
  );

}


