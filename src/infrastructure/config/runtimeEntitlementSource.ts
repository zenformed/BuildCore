/**
 * Where **`useSaaSProfile`** derives **`entitlementSnapshot`** for **`SaaSAuthGate`** (same snapshot shape).
 *
 * Distinct from **`NEXT_PUBLIC_ENTITLEMENT_SOURCE`** (`getSaasEntitlementReader` / parity only).
 *
 * Env: **`NEXT_PUBLIC_RUNTIME_ENTITLEMENT_SOURCE=profile|core`**
 * - **`core`** (default when unset): after a successful **`profiles`** load, **`GET /api/internal/apps/:appSlug/entitlement`**
 *   → ZenformedCore; on success use **`entitlement`**; on transient failure fall back to profile mapper; on deterministic
 *   auth / missing Core row (see hook) use **`null`** snapshot instead of profile fallback.
 * - **`profile`** (explicit): **`mapLegacyProfilesFieldsToSnapshot(profile)`** only — no Core entitlement relay in SaaS mode.
 */

export type RuntimeEntitlementSourceMode = 'profile' | 'core';

export function getRuntimeEntitlementSourceMode(): RuntimeEntitlementSourceMode {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_RUNTIME_ENTITLEMENT_SOURCE?.trim().toLowerCase()
      : '';
  if (raw === 'profile') return 'profile';
  return 'core';
}
