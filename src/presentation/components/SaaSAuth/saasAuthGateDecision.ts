import type { Session, User } from '@supabase/supabase-js';
import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { CorePlatformStatus, SaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { requiresOnboarding, requiresPasswordReset } from '@/presentation/hooks/saasProfileSelectors';

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
  loading: boolean
): SaaSAuthGateDecision {
  if (!session || !user) return 'unauthenticated';
  if (!profile) {
    return loading ? 'loadingProfile' : 'loadingProfile';
  }

  if (requiresPasswordReset(profile)) return 'passwordResetRequired';

  if (corePlatformStatus === 'unavailable') {
    return 'allowed';
  }

  if (requiresOnboarding(profile)) return 'onboardingRequired';
  if (!(entitlementSnapshot?.subscriptionActive ?? false)) return 'licenseRequired';
  return 'allowed';
}
