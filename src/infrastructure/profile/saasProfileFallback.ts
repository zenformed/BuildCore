import type { User } from '@supabase/supabase-js';
import type { SaaSProfile } from '@/presentation/providers/SaaSProfileProvider';

const PROFILE_CACHE_STORAGE_PREFIX = 'buildcore-saas-profile:v1:';

export function profileCacheStorageKey(userId: string): string {
  return `${PROFILE_CACHE_STORAGE_PREFIX}${userId}`;
}

export function loadCachedSaaSProfile(userId: string): SaaSProfile | null {
  if (typeof globalThis.sessionStorage === 'undefined') return null;
  try {
    const raw = globalThis.sessionStorage.getItem(profileCacheStorageKey(userId));
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as SaaSProfile;
    if (parsed?.id !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedSaaSProfile(profile: SaaSProfile): void {
  if (typeof globalThis.sessionStorage === 'undefined') return;
  try {
    globalThis.sessionStorage.setItem(profileCacheStorageKey(profile.id), JSON.stringify(profile));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedSaaSProfile(userId: string): void {
  if (typeof globalThis.sessionStorage === 'undefined') return;
  try {
    globalThis.sessionStorage.removeItem(profileCacheStorageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Minimal profile from Supabase Auth user when Core and `profiles` row are unavailable.
 * Safe for degraded/offline CRM entry only — not authoritative for billing.
 */
export function buildSessionDerivedSaaSProfile(user: User): SaaSProfile {
  const meta = user.user_metadata ?? {};
  const companyFromMeta =
    typeof meta.company_name === 'string' && meta.company_name.trim() !== ''
      ? meta.company_name.trim()
      : null;

  return {
    id: user.id,
    email: user.email ?? null,
    subscription_status: 'active',
    license_tier: 'STANDARD',
    company_name: companyFromMeta ?? 'Workspace',
    industry: typeof meta.industry === 'string' ? meta.industry : null,
    force_password_reset: meta.force_password_reset === true,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseProfilesRowToSaaSProfile(
  row: Record<string, unknown>,
  userId: string
): SaaSProfile {
  const tier = row.license_tier === 'PRO' ? 'PRO' : 'STANDARD';
  return {
    id: typeof row.id === 'string' ? row.id : userId,
    email: typeof row.email === 'string' ? row.email : null,
    subscription_status:
      typeof row.subscription_status === 'string' ? row.subscription_status : 'active',
    license_tier: tier,
    company_name: typeof row.company_name === 'string' ? row.company_name : null,
    industry: typeof row.industry === 'string' ? row.industry : null,
    force_password_reset: row.force_password_reset === true,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

/**
 * Resolve profile after Core relay failure: Supabase row → sessionStorage → session-derived.
 */
export function resolveProfileWhenCoreDegraded(
  user: User,
  supabaseRow: Record<string, unknown> | null
): SaaSProfile {
  if (supabaseRow != null) {
    const mapped = mapSupabaseProfilesRowToSaaSProfile(supabaseRow, user.id);
    saveCachedSaaSProfile(mapped);
    return mapped;
  }
  return loadCachedSaaSProfile(user.id) ?? buildSessionDerivedSaaSProfile(user);
}
