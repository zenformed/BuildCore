'use client';

import { useCallback, useEffect, useMemo, type ReactElement, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import type { BuildCoreNavigation } from '@/platform/navigation/buildCoreNavigationTypes';
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
  const nav = useBuildCoreNavigation();
  const dash = useBuildCoreDashboardContext();
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  const shellConfig = useMemo(
    () => resolveBuildCoreDashboardShellConfig(pathname, nav),
    [nav, pathname]
  );

  const onSidebarSelect = useCallback(
    (id: BuildCoreSidebarNavId) => {
      dash.setSidebarNav(id);
      if (id === 'reports') {
        if (dash.canAccessBuildCoreReports) {
          router.push(nav.routes.reports);
        }
        return;
      }
      if (id === 'photos') {
        router.push(nav.routes.photos);
        return;
      }
      if (id === 'map') {
        router.push(nav.routes.map);
        return;
      }
      if (id === 'teams') {
        if (dash.canAccessBuildCoreTeams) {
          router.push(nav.routes.teams);
        }
        return;
      }
      if (id === 'workflowStages') {
        if (dash.canAccessBuildCoreWorkflowStages) {
          router.push(nav.routes.workflowStages);
        }
        return;
      }
      if (id === 'notifications') {
        router.push(nav.routes.notifications);
        return;
      }
      router.push(nav.routes.dashboard);
    },
    [dash, nav, router]
  );

  useEffect(() => {
    const onTeamsRoute =
      pathname === nav.routes.teams || pathname.startsWith(`${nav.routes.teams}/`);
    if (onTeamsRoute && !dash.isOrganizationPermissionsLoading && !dash.canAccessBuildCoreTeams) {
      router.replace(nav.routes.dashboard);
    }
  }, [dash.canAccessBuildCoreTeams, dash.isOrganizationPermissionsLoading, pathname, router]);

  useEffect(() => {
    const onReportsRoute =
      pathname === nav.routes.reports || pathname.startsWith(`${nav.routes.reports}/`);
    const onPhotosRoute =
      pathname === nav.routes.photos || pathname.startsWith(`${nav.routes.photos}/`);
    const onMapRoute =
      pathname === nav.routes.map || pathname.startsWith(`${nav.routes.map}/`);
    if (onReportsRoute && !onPhotosRoute && !onMapRoute && isMemberRole) {
      router.replace(nav.routes.dashboard);
    }
  }, [isMemberRole, nav.routes.map, nav.routes.photos, nav.routes.reports, pathname, router]);

  useEffect(() => {
    const onWorkflowStagesRoute =
      pathname === nav.routes.workflowStages ||
      pathname.startsWith(`${nav.routes.workflowStages}/`);
    if (
      onWorkflowStagesRoute &&
      !dash.isOrganizationPermissionsLoading &&
      !dash.canAccessBuildCoreWorkflowStages
    ) {
      router.replace(nav.routes.dashboard);
    }
  }, [
    dash.canAccessBuildCoreWorkflowStages,
    dash.isOrganizationPermissionsLoading,
    pathname,
    router,
  ]);

  return (
    <BuildCoreDashboardShell
      title={shellConfig.title}
      sidebarActiveId={shellConfig.sidebarActiveId}
      onSidebarSelect={onSidebarSelect}
    >
      {children}
    </BuildCoreDashboardShell>
  );
}
