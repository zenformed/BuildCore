import { NextRequest, NextResponse } from 'next/server';

import { deleteOrganizationMember } from '@/infrastructure/coreApi/organizationWorkspaceClient';

import { relayOrganizationMutate } from '../../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  return relayOrganizationMutate(
    request,
    (token) => deleteOrganizationMember(token, memberId),
    { rejectedError: 'member_remove_rejected' }
  );
}
