'use client';

import React, { type ReactElement } from 'react';
import { env } from '@/infrastructure/config/env';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import {
  ZenformedOrganizationBrandingProvider,
  useZenformedOrganizationBrandingShell,
  type ZenformedOrganizationBrandingShellState,
} from '@zenformed/core/organization-branding';

export type BrandingState = ZenformedOrganizationBrandingShellState;

export function BrandingProvider({ children }: { children: React.ReactNode }): ReactElement {
  const { session, corePlatformStatus } = useSaaSProfile();
  const accessToken = env.isSaasMode ? session?.access_token ?? null : null;

  return (
    <ZenformedOrganizationBrandingProvider
      defaultDisplayNameFallback={buildcoreAppDefinition.displayName}
      getAccessToken={() => accessToken}
      sessionUserId={session?.user?.id ?? null}
      requireAuthForLogo={usesCoreOrganizationBranding()}
      corePlatformAvailable={corePlatformStatus === 'available'}
    >
      {/* Linked @zenformed/core may resolve a different @types/react than the app. */}
      {children as never}
    </ZenformedOrganizationBrandingProvider>
  );
}

export function useBrandingContext(): BrandingState {
  return useZenformedOrganizationBrandingShell();
}
