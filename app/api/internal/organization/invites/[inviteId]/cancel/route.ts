import { NextRequest } from 'next/server';
import { cancelOrganizationInvite } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import { relayOrganizationMutate } from '../../../coreOrganizationRelay';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await context.params;
  return relayOrganizationMutate(
    request,
    (token) => cancelOrganizationInvite(token, inviteId),
    { rejectedError: 'invite_cancel_rejected' }
  );
}

