'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { env } from '@/infrastructure/config/env';
import { BrandingProvider } from '@/presentation/providers/BrandingProvider';
import { SaaSProfileProvider } from '@/presentation/providers/SaaSProfileProvider';
import { TenantProvider } from '@/presentation/providers/TenantProvider';
import { BuildCorePresenceProvider } from '@/presentation/providers/BuildCorePresenceProvider';
import { CorePlatformAppShell } from '@/presentation/components/CorePlatform/CorePlatformAppShell';
import { SaaSAuthGate } from '@/presentation/components/SaaSAuth/SaaSAuthGate';

export interface BuildCoreRootGateProps {
  children: React.ReactNode;
}

/**
 * SaaS-only root: ZenformedCore-backed profile + entitlement gate (no file/mock first-run in this repo).
 */
export function BuildCoreRootGate({ children }: BuildCoreRootGateProps): React.ReactElement {
  const pathname = usePathname();
  const isPublicPortal =
    pathname?.startsWith('/customer-task') || pathname?.startsWith('/lead');
  const isDemoExperience = pathname?.startsWith('/demo');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const globalState = window as typeof window & {
      __buildcorePresenceConsoleFiltered__?: boolean;
    };
    if (globalState.__buildcorePresenceConsoleFiltered__) return;

    const shouldSuppress = (args: unknown[]): boolean => {
      const first = args[0];
      return typeof first === 'string' && first.includes('[zenformed-presence]');
    };

    const originalInfo = console.info.bind(console);
    const originalDebug = console.debug.bind(console);
    const originalLog = console.log.bind(console);

    console.info = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      originalInfo(...args);
    };
    console.debug = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      originalDebug(...args);
    };
    console.log = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      originalLog(...args);
    };

    globalState.__buildcorePresenceConsoleFiltered__ = true;
  }, []);

  if (isPublicPortal || isDemoExperience) {
    return <>{children}</>;
  }

  if (!env.isSaasMode) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ marginTop: 0 }}>BuildCore</h1>
        <p>
          Set <code>NEXT_PUBLIC_SAAS_MODE=true</code> with Supabase and ZenformedCore env vars (see{' '}
          <code>.env.example</code>).
        </p>
      </div>
    );
  }

  return (
    <SaaSProfileProvider>
      <SaaSAuthGate>
        <BuildCorePresenceProvider>
          <BrandingProvider>
            <CorePlatformAppShell>
              <TenantProvider>{children}</TenantProvider>
            </CorePlatformAppShell>
          </BrandingProvider>
        </BuildCorePresenceProvider>
      </SaaSAuthGate>
    </SaaSProfileProvider>
  );
}
