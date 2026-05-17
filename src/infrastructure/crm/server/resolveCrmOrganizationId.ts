import type { SupabaseClient } from '@supabase/supabase-js';

type MembershipRow = { organization_id: string };

/**
 * Resolve the active organization for CRM queries.
 * Prefers JWT app_metadata.tenant_id when the user has active membership in that org.
 */
export async function resolveCrmOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  preferredOrganizationId?: string | null
): Promise<string | null> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('membership_status', 'active');

  if (error || !data?.length) return null;

  const orgIds = (data as MembershipRow[]).map((row) => row.organization_id);
  if (
    preferredOrganizationId &&
    orgIds.includes(preferredOrganizationId)
  ) {
    return preferredOrganizationId;
  }
  return orgIds[0] ?? null;
}
