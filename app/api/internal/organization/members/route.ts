import { NextRequest } from 'next/server';
import { getOrganizationMembers } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import { relayOrganizationGet } from '../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return relayOrganizationGet(request, getOrganizationMembers);
}
