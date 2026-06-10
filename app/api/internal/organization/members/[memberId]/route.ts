import { NextRequest, NextResponse } from 'next/server';

import {
  deleteOrganizationMember,
  patchOrganizationMemberProfile,
} from '@/infrastructure/coreApi/organizationWorkspaceClient';
import type { ZenformedCoreOrganizationMemberProfileUpdateRequest } from '@/infrastructure/coreApi/types';

import { relayOrganizationMutate } from '../../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }
  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected JSON object' }, { status: 400 });
  }
  const payload = body as ZenformedCoreOrganizationMemberProfileUpdateRequest;
  return relayOrganizationMutate(
    request,
    (token) => patchOrganizationMemberProfile(token, memberId, payload),
    { rejectedError: 'member_profile_update_rejected', requiredPermission: 'canManageMemberProfiles' }
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  return relayOrganizationMutate(
    request,
    (token) => deleteOrganizationMember(token, memberId),
    { rejectedError: 'member_remove_rejected', requiredPermission: 'canRemoveMembers' }
  );
}
