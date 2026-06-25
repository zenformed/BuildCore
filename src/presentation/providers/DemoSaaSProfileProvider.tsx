'use client';

import { useMemo, type ReactElement, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createDemoEntitlementSnapshot,
  createDemoOrganizationMembershipContext,
  createDemoSaaSProfile,
  createDemoSupabaseSession,
} from '@/infrastructure/demo/demoProfileFixtures';
import {
  SaaSProfileContext,
  type SaaSProfileContextValue,
} from '@/presentation/providers/SaaSProfileProvider';

export type DemoSaaSProfileProviderProps = {
  readonly children: ReactNode;
};

/**
 * Supplies synthetic SaaS profile context for the demo runtime without touching production auth APIs.
 */
export function DemoSaaSProfileProvider({ children }: DemoSaaSProfileProviderProps): ReactElement {
  const session = useMemo<Session>(() => createDemoSupabaseSession(), []);
  const profile = useMemo(() => createDemoSaaSProfile(), []);
  const organizationMembershipContext = useMemo(() => createDemoOrganizationMembershipContext(), []);
  const entitlementSnapshot = useMemo(() => createDemoEntitlementSnapshot(), []);

  const value = useMemo<SaaSProfileContextValue>(
    () => ({
      session,
      user: session.user,
      profile,
      organizationMembershipContext,
      membershipContextStatus: 'ready',
      entitlementSnapshot,
      entitlementResolutionStatus: 'unused',
      corePlatformStatus: 'not_required',
      loading: false,
      error: null,
      refetch: async () => {},
      waitForAppAccessReady: async () => ({ ok: true as const }),
    }),
    [entitlementSnapshot, organizationMembershipContext, profile, session]
  );

  return <SaaSProfileContext.Provider value={value}>{children}</SaaSProfileContext.Provider>;
}
