import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { loadEffectiveBuildCoreProjectAccessScopesForActiveMembers } from '@/infrastructure/crm/server/buildCoreProjectAccessScopeService';
import { createCrmServiceRoleClient } from '@/infrastructure/crm/server/createCrmServiceRoleClient';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;
  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    // The authenticated membership table policy intentionally exposes only the
    // caller's membership. Authorization above is evaluated with that client;
    // use the server-only client solely to enumerate this already-authorized
    // organization's active roster and effective capability rows.
    const service = createCrmServiceRoleClient();
    if (service == null) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 503 });
    }
    const entries = await loadEffectiveBuildCoreProjectAccessScopesForActiveMembers(
      service,
      auth.context.organizationId
    );
    return NextResponse.json({ entries }, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load project visibility settings.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
