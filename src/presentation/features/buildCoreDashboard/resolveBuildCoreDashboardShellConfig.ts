import type { BuildCoreNavigation } from '@/platform/navigation/buildCoreNavigationTypes';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';

export type BuildCoreDashboardShellConfig = {
  readonly sidebarActiveId: BuildCoreSidebarNavId;
  readonly title: string | null;
};

export function resolveBuildCoreDashboardShellConfig(
  pathname: string,
  nav: BuildCoreNavigation
): BuildCoreDashboardShellConfig {
  if (pathname === nav.routes.teams || pathname.startsWith(`${nav.routes.teams}/`)) {
    return {
      sidebarActiveId: 'teams',
      title: null,
    };
  }

  if (
    pathname === nav.routes.workflowStages ||
    pathname.startsWith(`${nav.routes.workflowStages}/`)
  ) {
    return {
      sidebarActiveId: 'workflowStages',
      title: null,
    };
  }

  if (pathname === nav.routes.reports || pathname.startsWith(`${nav.routes.reports}/`)) {
    return {
      sidebarActiveId: 'reports',
      title: null,
    };
  }

  if (pathname.startsWith('/demo/projects') || pathname.startsWith('/projects')) {
    return {
      sidebarActiveId: 'projects',
      title: null,
    };
  }

  return {
    sidebarActiveId: 'projects',
    title: null,
  };
}
