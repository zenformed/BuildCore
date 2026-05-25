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
import { loadCrmAssignmentIdentitiesForOrg } from './crmAssignmentIdentityService';

export type LoadCrmMemberMapOptions = {
  readonly organizationId?: string;
};

function isWeakCrmMemberRef(ref: CrmTeamMemberRef): boolean {
  return /^Member [0-9a-f]{8}$/i.test(ref.displayName.trim());
}

async function enrichMemberMapFromOrgIdentities(
  map: Map<string, CrmTeamMemberRef>,
  memberIds: readonly string[],
  organizationId: string
): Promise<void> {
  if (memberIds.length === 0) return;
  const service = createPlatformAvatarServiceClient();
  if (service == null) return;

  const orgRefs = await loadCrmAssignmentIdentitiesForOrg(organizationId);
  const orgById = new Map(orgRefs.map((ref) => [ref.id, ref]));

  for (const id of memberIds) {
    const enriched = orgById.get(id);
    if (enriched == null) continue;
    const existing = map.get(id);
    if (existing == null || isWeakCrmMemberRef(existing)) {
      map.set(id, enriched);
    }
  }
}

export async function loadCrmMemberMap(
  supabase: SupabaseClient,
  memberIds: readonly string[],
  options?: LoadCrmMemberMapOptions
): Promise<Map<string, CrmTeamMemberRef>> {
  const map = new Map<string, CrmTeamMemberRef>();
  if (memberIds.length === 0) return map;

  const profileClient = createPlatformAvatarServiceClient() ?? supabase;
  const { data } = await profileClient
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('id', [...memberIds]);
  const profiles = (data ?? []) as DbProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const avatarService = createPlatformAvatarServiceClient();
  const revisionByUserId =
    avatarService != null
      ? await loadAvatarRevisionsByUserId(avatarService, memberIds)
      : new Map<string, string>();

  for (const id of memberIds) {
    const revision = revisionByUserId.get(id);
    const avatarUrl = buildAuthUserAvatarUrl(id, revision);
    map.set(id, mapProfileToTeamMemberRef(profileById.get(id), id, avatarUrl));
  }

  const organizationId = options?.organizationId?.trim();
  if (organizationId) {
    await enrichMemberMapFromOrgIdentities(map, memberIds, organizationId);
  }

  return map;
}
