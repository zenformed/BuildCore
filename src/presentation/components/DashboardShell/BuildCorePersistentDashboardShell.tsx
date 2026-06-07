'use client';

import { useCallback, useEffect, useMemo, type ReactElement, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { resolveBuildCoreDashboardShellConfig } from '@/presentation/features/buildCoreDashboard/resolveBuildCoreDashboardShellConfig';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
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
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  const shellConfig = useMemo(
    () => resolveBuildCoreDashboardShellConfig(pathname),
    [pathname]
  );
  const showNewProjectButton = shellConfig.showProjectActions && !isMemberRole;

  const onSidebarSelect = useCallback(
    (id: BuildCoreSidebarNavId) => {
      dash.setSidebarNav(id);
      if (id === 'reports') {
        router.push(nav.routes.reports);
        return;
      }
      if (id === 'teams') {
        if (dash.canAccessBuildCoreTeams) {
          router.push(nav.routes.teams);
        }
        return;
      }
      router.push(nav.routes.dashboard);
    },
    [dash, router]
  );

  useEffect(() => {
    const onTeamsRoute =
      pathname === nav.routes.teams || pathname.startsWith(`${nav.routes.teams}/`);
    if (onTeamsRoute && !dash.canAccessBuildCoreTeams) {
      router.replace(nav.routes.dashboard);
    }
  }, [dash.canAccessBuildCoreTeams, pathname, router]);

  return (
    <BuildCoreDashboardShell
      title={shellConfig.title}
      showProjectActions={shellConfig.showProjectActions}
      showNewProjectButton={showNewProjectButton}
      sidebarActiveId={shellConfig.sidebarActiveId}
      onSidebarSelect={onSidebarSelect}
    >
      {children}
    </BuildCoreDashboardShell>
  );
}
