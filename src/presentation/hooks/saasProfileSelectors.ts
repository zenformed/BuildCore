import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { SaaSProfile, LicenseTier } from './useSaaSProfile';

/**
 * Tier from entitlement snapshot (legacy-derived via useSaaSProfile entitlementSnapshot).
 * Defaults to STANDARD when missing.
 */
export function getLicenseTierFromSnapshot(
  snapshot: SaaSEntitlementSnapshot | null | undefined
): LicenseTier {
  return snapshot?.licenseTier ?? 'STANDARD';
}

/**
 * True when snapshot indicates active subscription access.
 */
export function isSubscriptionActiveFromSnapshot(
  snapshot: SaaSEntitlementSnapshot | null | undefined
): boolean {
  return snapshot?.subscriptionActive ?? false;
}

/**
 * PRO-gated features: active subscription and PRO tier.
 */
export function hasProAccessFromSnapshot(snapshot: SaaSEntitlementSnapshot | null | undefined): boolean {
  return (snapshot?.subscriptionActive ?? false) && snapshot?.licenseTier === 'PRO';
}

/**
 * True when user must update password before app access.
 */
export function requiresPasswordReset(profile: SaaSProfile | null | undefined): boolean {
  return profile?.force_password_reset === true;
}

/**
 * True when company onboarding details are incomplete.
 */
export function requiresOnboarding(profile: SaaSProfile | null | undefined): boolean {
  return !hasCompanyProfile(profile);
}

/**
 * True when company profile has a non-empty company name.
 */
export function hasCompanyProfile(profile: SaaSProfile | null | undefined): boolean {
  return typeof profile?.company_name === 'string' && profile.company_name.trim() !== '';
}
