'use client';

import { type ReactElement, type ReactNode } from 'react';
import { ZenformedPresenceProvider } from '@zenformed/core/presence';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';
import { useSaaSProfile } from '@/presentation/providers/SaaSProfileProvider';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

export type BuildCorePresenceProviderProps = {
  readonly children: ReactNode;
};

/**
 * Organization-scoped Realtime Presence for BuildCore (shared with Platform).
 */
export function BuildCorePresenceProvider({
  children,
}: BuildCorePresenceProviderProps): ReactElement {
  const { user, organizationMembershipContext } = useSaaSProfile();
  const organizationId = organizationMembershipContext?.organizationId ?? null;
  const userId = user?.id?.trim() || null;
  const enabled = !runtimeModes.isDemoRuntime();

  return (
    <ZenformedPresenceProvider
      supabase={enabled ? getSupabaseClient() : null}
      userId={userId}
      organizationId={organizationId}
      appSlug={buildcoreAppDefinition.appSlug}
      enabled={enabled}
    >
      {children}
    </ZenformedPresenceProvider>
  );
}
