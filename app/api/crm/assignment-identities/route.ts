import { NextRequest, NextResponse } from 'next/server';
import { loadCrmAssignmentIdentitiesForOrg } from '@/infrastructure/crm/server/crmAssignmentIdentityService';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const members = await loadCrmAssignmentIdentitiesForOrg(auth.context.organizationId);
    return NextResponse.json({ members });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load assignment identities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
