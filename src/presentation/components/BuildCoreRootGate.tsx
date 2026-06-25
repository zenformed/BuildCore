'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { env } from '@/infrastructure/config/env';
import { BrandingProvider } from '@/presentation/providers/BrandingProvider';
import { SaaSProfileProvider } from '@/presentation/providers/SaaSProfileProvider';
import { TenantProvider } from '@/presentation/providers/TenantProvider';
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

  if (isPublicPortal) {
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
        <BrandingProvider>
          <CorePlatformAppShell>
            <TenantProvider>{children}</TenantProvider>
          </CorePlatformAppShell>
        </BrandingProvider>
      </SaaSAuthGate>
    </SaaSProfileProvider>
  );
}
