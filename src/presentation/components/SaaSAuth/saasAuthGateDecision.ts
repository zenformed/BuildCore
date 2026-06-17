import type { Session, User } from '@supabase/supabase-js';
import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { CorePlatformStatus, SaaSProfile, MembershipContextStatus, EntitlementResolutionStatus } from '@/presentation/hooks/useSaaSProfile';
import { hasCompanyProfile, requiresOnboarding, requiresPasswordReset } from '@/presentation/hooks/saasProfileSelectors';
import { getRuntimeEntitlementSourceMode } from '@/infrastructure/config/runtimeEntitlementSource';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { isZenformedCorePlatformRequired } from '@/infrastructure/coreApi/corePlatformRequirement';

export type OrganizationMembershipContext = {
  hasActiveMembership: boolean;
  hasNonPersonalOrganizationMembership: boolean;
  membershipKind: 'none' | 'organization_bootstrap_owner' | 'invited_member';
};

export type SaaSAuthGateDecision =
  | 'unauthenticated'
  | 'loadingProfile'
  | 'passwordResetRequired'
  | 'onboardingRequired'
  | 'licenseRequired'
  | 'allowed';

/**
 * Pure policy decision for SaaS auth gate state.
 * Core outage does not block entry when a Supabase session (and resolved profile) exist.
 */
export function getSaaSAuthGateDecision(
  session: Session | null,
  user: User | null,
  profile: SaaSProfile | null,
  entitlementSnapshot: SaaSEntitlementSnapshot | null,
  corePlatformStatus: CorePlatformStatus,
  loading: boolean,
  membershipContext: OrganizationMembershipContext | null,
  membershipContextStatus: MembershipContextStatus,
  entitlementResolutionStatus: EntitlementResolutionStatus
): SaaSAuthGateDecision {
  if (!session || !user) return 'unauthenticated';
  if (!profile) {
    return loading ? 'loadingProfile' : 'loadingProfile';
  }

  if (requiresPasswordReset(profile)) return 'passwordResetRequired';

  if (corePlatformStatus === 'unavailable') {
    return 'allowed';
  }

  if (!hasCompanyProfile(profile)) {
    if (membershipContextStatus === 'pending') {
      return 'loadingProfile';
    }
    if (membershipContextStatus === 'ready' && requiresOnboarding(profile, membershipContext)) {
      return 'onboardingRequired';
    }
  }

  const coreEntitlementPending =
    getRuntimeEntitlementSourceMode() === 'core' &&
    runtimeModes.isSaasMode() &&
    !runtimeModes.useMockAuth() &&
    isZenformedCorePlatformRequired() &&
    entitlementResolutionStatus === 'pending' &&
    !(entitlementSnapshot?.subscriptionActive ?? false);
  if (coreEntitlementPending) {
    return 'loadingProfile';
  }

  if (!(entitlementSnapshot?.subscriptionActive ?? false)) {
    return 'licenseRequired';
  }
  return 'allowed';
}
