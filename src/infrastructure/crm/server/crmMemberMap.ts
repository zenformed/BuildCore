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

export async function loadCrmMemberMap(
  supabase: SupabaseClient,
  memberIds: readonly string[]
): Promise<Map<string, CrmTeamMemberRef>> {
  const map = new Map<string, CrmTeamMemberRef>();
  if (memberIds.length === 0) return map;

  const { data } = await supabase.from('profiles').select('id, email').in('id', [...memberIds]);
  const profiles = (data ?? []) as DbProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const avatarService = createPlatformAvatarServiceClient();
  const revisionByUserId =
    avatarService != null
      ? await loadAvatarRevisionsByUserId(avatarService, memberIds)
      : new Map<string, string>();

  for (const id of memberIds) {
    const revision = revisionByUserId.get(id);
    const avatarUrl =
      revision != null ? buildAuthUserAvatarUrl(id, revision) : null;
    map.set(id, mapProfileToTeamMemberRef(profileById.get(id), id, avatarUrl));
  }
  return map;
}
