import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { SaaSProfile } from './useSaaSProfile';
import { isAppEntitlementActive } from '@zenformed/core';

/**
 * Active BuildCore app entitlement from platform_app_entitlements (via Core relay).
 */
export function isSubscriptionActiveFromSnapshot(
  snapshot: SaaSEntitlementSnapshot | null | undefined
): boolean {
  return isAppEntitlementActive(snapshot);
}

/**
 * True when user must update password before app access.
 */
export function requiresPasswordReset(profile: SaaSProfile | null | undefined): boolean {
  return profile?.force_password_reset === true;
}

/**
 * True when company onboarding details are incomplete.
 * Only org bootstrap owners without company profile require onboarding — not invited members.
 */
export function requiresOnboarding(
  profile: SaaSProfile | null | undefined,
  membershipContext?: {
    hasNonPersonalOrganizationMembership?: boolean;
    membershipKind?: import('./useSaaSProfile').OrganizationMembershipKind;
  } | null
): boolean {
  if (hasCompanyProfile(profile)) return false;
  if (membershipContext?.membershipKind === 'invited_member') return false;
  if (membershipContext?.hasNonPersonalOrganizationMembership === true) return false;
  if (membershipContext?.membershipKind === 'organization_bootstrap_owner') return true;
  if (membershipContext?.membershipKind === 'none') return true;
  return membershipContext == null;
}

/**
 * True when company profile has a non-empty company name.
 */
export function hasCompanyProfile(profile: SaaSProfile | null | undefined): boolean {
  return typeof profile?.company_name === 'string' && profile.company_name.trim() !== '';
}
