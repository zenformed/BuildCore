'use client';

import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { resolveBuildCoreDashboardShellConfig } from '@/presentation/features/buildCoreDashboard/resolveBuildCoreDashboardShellConfig';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import type { BuildCoreSidebarNavId } from './BuildCoreSidebar';
import { BuildCoreDashboardShell } from './BuildCoreDashboardShell';

export type BuildCorePersistentDashboardShellProps = {
  children: ReactNode;
};

export function BuildCorePersistentDashboardShell({
  children,
}: BuildCorePersistentDashboardShellProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const dash = useBuildCoreDashboardContext();

  const shellConfig = useMemo(
    () => resolveBuildCoreDashboardShellConfig(pathname),
    [pathname]
  );

  const onSidebarSelect = useCallback(
    (id: BuildCoreSidebarNavId) => {
      dash.setSidebarNav(id);
      if (id === 'reports') {
        router.push(nav.routes.reports);
        return;
      }
      router.push(nav.routes.dashboard);
    },
    [dash, router]
  );

  return (
    <BuildCoreDashboardShell
      title={shellConfig.title}
      showProjectActions={shellConfig.showProjectActions}
      sidebarActiveId={shellConfig.sidebarActiveId}
      onSidebarSelect={onSidebarSelect}
    >
      {children}
    </BuildCoreDashboardShell>
  );
}
