/**
 * Feature flag for which entitlement backend `getSaasEntitlementReader` returns
 * (`NEXT_PUBLIC_ENTITLEMENT_SOURCE`). **Does not** drive `useSaaSProfile.entitlementSnapshot` — use
 * **`NEXT_PUBLIC_RUNTIME_ENTITLEMENT_SOURCE`** (`getRuntimeEntitlementSourceMode`) for that.
 * `platform_tables` is optional for parity/diagnostics/future single-owner wiring.
 *
 * Env: `NEXT_PUBLIC_ENTITLEMENT_SOURCE=legacy_profiles|platform_tables`
 */

export type SaasEntitlementSourceMode = 'legacy_profiles' | 'platform_tables';

export function getSaasEntitlementSourceMode(): SaasEntitlementSourceMode {
  const raw =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENTITLEMENT_SOURCE?.trim().toLowerCase() : '';
  if (raw === 'platform_tables') return 'platform_tables';
  return 'legacy_profiles';
}
