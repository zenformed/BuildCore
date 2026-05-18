/**
 * Read platform user avatars from Supabase (same bucket/table as ZenformedCore).
 * Service role only — used by CRM member mapping and `/api/auth/user-avatar`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const USER_AVATARS_BUCKET = 'user-avatars';

type AvatarMetaRow = {
  user_id: string;
  revision: string;
  content_type: string;
};

function getServiceEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey?.trim()) return null;
  return { url, serviceKey: serviceKey.trim() };
}

export function createPlatformAvatarServiceClient(): SupabaseClient | null {
  const env = getServiceEnv();
  if (env == null) return null;
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function storageObjectPath(userId: string): string {
  return `users/${userId}/avatar`;
}

export async function loadAvatarRevisionsByUserId(
  service: SupabaseClient,
  userIds: readonly string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const { data, error } = await service
    .from('platform_user_avatars')
    .select('user_id, revision')
    .in('user_id', [...userIds]);

  if (error != null) {
    throw new Error(`avatar_meta_batch_failed: ${error.message}`);
  }

  for (const row of (data ?? []) as AvatarMetaRow[]) {
    if (row.revision) map.set(row.user_id, row.revision);
  }
  return map;
}

export async function usersShareActiveOrganization(
  service: SupabaseClient,
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  if (userIdA === userIdB) return true;

  const { data, error } = await service
    .from('platform_organization_members')
    .select('user_id, organization_id')
    .in('user_id', [userIdA, userIdB])
    .eq('membership_status', 'active');

  if (error != null) return false;

  const orgsByUser = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const uid = (row as { user_id: string; organization_id: string }).user_id;
    const orgId = (row as { user_id: string; organization_id: string }).organization_id;
    if (!orgsByUser.has(uid)) orgsByUser.set(uid, new Set());
    orgsByUser.get(uid)!.add(orgId);
  }

  const orgsA = orgsByUser.get(userIdA);
  const orgsB = orgsByUser.get(userIdB);
  if (!orgsA || !orgsB) return false;

  for (const orgId of orgsA) {
    if (orgsB.has(orgId)) return true;
  }
  return false;
}

export async function downloadPlatformUserAvatar(
  service: SupabaseClient,
  userId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const { data: meta } = await service
    .from('platform_user_avatars')
    .select('user_id, revision, content_type')
    .eq('user_id', userId)
    .maybeSingle();

  if (meta == null) return null;

  const path = storageObjectPath(userId);
  const { data, error } = await service.storage.from(USER_AVATARS_BUCKET).download(path);
  if (error != null || data == null) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  const row = meta as AvatarMetaRow;
  return {
    buffer,
    contentType: row.content_type || 'image/png',
  };
}
