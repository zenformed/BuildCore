import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { createCrmServiceRoleClient } from '@/infrastructure/crm/server/createCrmServiceRoleClient';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { isBuildCoreProjectAccessScope } from '@/domain/buildcore/projectAccessScope';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { userId: string } };

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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
  const userId = context.params.userId?.trim();
  if (!userId) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  let body: { projectAccessScope?: unknown };
  try {
    body = (await request.json()) as { projectAccessScope?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!isBuildCoreProjectAccessScope(body.projectAccessScope)) {
    return NextResponse.json({ error: 'invalid_project_access_scope' }, { status: 400 });
  }
  // Membership RLS intentionally exposes only the caller's membership. The
  // actor has already been verified as an Owner/Admin above, so use the
  // server-side client solely to resolve the requested active member inside
  // the current organization.
  const service = createCrmServiceRoleClient();
  if (service == null) return NextResponse.json({ error: 'server_misconfigured' }, { status: 503 });
  const { data: member, error: memberError } = await service
    .from('platform_organization_members')
    .select('user_id, role')
    .eq('organization_id', auth.context.organizationId)
    .eq('user_id', userId)
    .eq('membership_status', 'active')
    .maybeSingle();
  if (memberError != null) return NextResponse.json({ error: 'member_lookup_failed' }, { status: 500 });
  if (member == null) return NextResponse.json({ error: 'member_not_found' }, { status: 404 });
  // Owners and admins are always effectively unrestricted. Remove any stale
  // explicit restriction rather than leaving a misleading configuration row.
  if (member.role === 'owner' || member.role === 'admin') {
    const { error } = await auth.context.supabase
      .from('buildcore_project_member_access')
      .delete()
      .eq('organization_id', auth.context.organizationId)
      .eq('user_id', userId);
    if (error != null) return NextResponse.json({ error: 'project_access_scope_save_failed' }, { status: 500 });
    return NextResponse.json({ userId, projectAccessScope: 'all' });
  }
  const { error } = await auth.context.supabase.from('buildcore_project_member_access').upsert(
    { organization_id: auth.context.organizationId, user_id: userId, project_access_scope: body.projectAccessScope },
    { onConflict: 'organization_id,user_id' }
  );
  if (error != null) return NextResponse.json({ error: 'project_access_scope_save_failed' }, { status: 500 });
  return NextResponse.json({ userId, projectAccessScope: body.projectAccessScope });
}
