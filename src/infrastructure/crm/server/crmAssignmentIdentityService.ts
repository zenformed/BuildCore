import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmTeamMemberRef } from '@/domain/crm';
import {
  mapProfileToTeamMemberRef,
  type DbProfileRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { buildAuthUserAvatarUrl } from '@/infrastructure/userAvatar/authUserAvatarUrl';
import {
  createPlatformAvatarServiceClient,
  loadAvatarRevisionsByUserId,
} from '@/infrastructure/userAvatar/platformUserAvatarStorage';

type OrgMemberRow = {
  user_id: string;
};

/**
 * Load org member refs for CRM assignment pickers.
 * Uses service role for profile/avatar reads so all org CRM viewers resolve the same identities.
 */
export async function loadCrmAssignmentIdentitiesForOrg(
  organizationId: string
): Promise<readonly CrmTeamMemberRef[]> {
  const service = createPlatformAvatarServiceClient();
  if (service == null) return [];

  const { data: memberRows, error: memberError } = await service
    .from('platform_organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('membership_status', 'active');

  if (memberError) {
    throw new Error(memberError.message);
  }

  const userIds = (memberRows ?? []).map((row) => (row as OrgMemberRow).user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  const { data: profileRows, error: profileError } = await service
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('id', userIds);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profiles = (profileRows ?? []) as DbProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const revisionByUserId = await loadAvatarRevisionsByUserId(service, userIds);

  const refs: CrmTeamMemberRef[] = [];
  for (const userId of userIds) {
    const revision = revisionByUserId.get(userId);
    const avatarUrl = buildAuthUserAvatarUrl(userId, revision);
    refs.push(mapProfileToTeamMemberRef(profileById.get(userId), userId, avatarUrl));
  }

  refs.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
  return refs;
}
