import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

function parseOrganizationMemberRole(raw: string | null | undefined): OrganizationMemberRole | null {
  if (raw === 'owner' || raw === 'admin' || raw === 'coordinator' || raw === 'member') return raw;
  return null;
}

async function loadActiveMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRole | null> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (error != null) {
    throw new Error(`org_member_role_read_failed: ${error.message}`);
  }
  return parseOrganizationMemberRole(data?.role != null ? String(data.role) : null);
}

export function projectTemplatePermissionForbiddenResponse(message: string): NextResponse {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 });
}

export async function requireCanManageBuildCoreProjectTemplates(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  message = 'You do not have permission to manage project templates.'
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (runtimeModes.useMockAuth()) {
    return { ok: true };
  }

  const role = await loadActiveMemberRole(supabase, organizationId, userId);
  if (!canManageBuildCoreProjectTemplates(role)) {
    return { ok: false, response: projectTemplatePermissionForbiddenResponse(message) };
  }
  return { ok: true };
}
