'use client';

import { useCallback, useState, type ReactElement, type ReactNode } from 'react';
import { BrandingProvider } from '@/presentation/providers/BrandingProvider';
import { TenantProvider } from '@/presentation/providers/TenantProvider';
import { CorePlatformAppShell } from '@/presentation/components/CorePlatform/CorePlatformAppShell';
import { BuildCoreNavigationProvider } from '@/presentation/providers/BuildCoreNavigationProvider';
import { DemoModeProvider } from '@/presentation/providers/DemoModeProvider';
import { DemoSaaSProfileProvider } from '@/presentation/providers/DemoSaaSProfileProvider';
import { DemoRuntimeBootstrap } from '@/presentation/components/Demo/DemoRuntimeBootstrap';
import { DemoBanner } from '@/presentation/components/Demo/DemoBanner';
import { buildCoreDemoNavigation } from '@/platform/navigation/buildCoreDemoNavigation';

export type DemoRootGateProps = {
  readonly children: ReactNode;
};

/**
 * Root gate for the interactive demo runtime.
 * Isolated from production SaaS auth — uses synthetic profile + demo CRM persistence.
 */
export function DemoRootGate({ children }: DemoRootGateProps): ReactElement {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const onSessionReady = useCallback((nextSessionId: string) => {
    setSessionId(nextSessionId);
  }, []);

  if (sessionId == null) {
    return <DemoRuntimeBootstrap onSessionReady={onSessionReady}>{null}</DemoRuntimeBootstrap>;
  }

  return (
    <DemoModeProvider sessionId={sessionId}>
      <BuildCoreNavigationProvider navigation={buildCoreDemoNavigation}>
        <DemoSaaSProfileProvider>
          <BrandingProvider>
            <CorePlatformAppShell>
              <TenantProvider>
                {children}
                <DemoBanner />
              </TenantProvider>
            </CorePlatformAppShell>
          </BrandingProvider>
        </DemoSaaSProfileProvider>
      </BuildCoreNavigationProvider>
    </DemoModeProvider>
  );
}
