import { NextRequest } from 'next/server';
import { getOrganizationAssignmentIdentities } from '@/infrastructure/coreApi/organizationWorkspaceClient';
import { relayOrganizationGet } from '../coreOrganizationRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const appSlug = request.nextUrl.searchParams.get('appSlug')?.trim() || 'buildcore';
  return relayOrganizationGet(request, (token) => getOrganizationAssignmentIdentities(token, appSlug));
}
