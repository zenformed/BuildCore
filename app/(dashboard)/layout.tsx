'use client';

import type { ReactElement, ReactNode } from 'react';
import { BuildCorePersistentDashboardShell } from '@/presentation/components/DashboardShell/BuildCorePersistentDashboardShell';
import { BuildCoreDashboardProvider } from '@/presentation/providers/BuildCoreDashboardProvider';

export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <BuildCoreDashboardProvider>
      <BuildCorePersistentDashboardShell>{children}</BuildCorePersistentDashboardShell>
    </BuildCoreDashboardProvider>
  );
}
