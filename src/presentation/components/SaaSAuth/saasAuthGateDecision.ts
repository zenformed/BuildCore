import type { Session, User } from '@supabase/supabase-js';
import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { SaaSProfile } from '@/presentation/hooks/useSaaSProfile';
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
 * No routing, rendering, or side effects here.
 * License access uses `entitlementSnapshot.subscriptionActive` (Core relay after profile when runtime source
 * is **`core`**, the default when **`NEXT_PUBLIC_RUNTIME_ENTITLEMENT_SOURCE`** is unset; **`profile`** forces mapper-only).
 */
export function getSaaSAuthGateDecision(
  session: Session | null,
  user: User | null,
  profile: SaaSProfile | null,
  entitlementSnapshot: SaaSEntitlementSnapshot | null
): SaaSAuthGateDecision {
  if (!session || !user) return 'unauthenticated';
  if (!profile) return 'loadingProfile';
  if (requiresPasswordReset(profile)) return 'passwordResetRequired';
  if (requiresOnboarding(profile)) return 'onboardingRequired';
  if (!(entitlementSnapshot?.subscriptionActive ?? false)) return 'licenseRequired';
  return 'allowed';
}

