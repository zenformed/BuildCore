import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';

export type BuildCoreDashboardShellConfig = {
  readonly sidebarActiveId: BuildCoreSidebarNavId;
  readonly title: string | null;
  readonly showProjectActions: boolean;
};

export function resolveBuildCoreDashboardShellConfig(pathname: string): BuildCoreDashboardShellConfig {
  if (pathname === nav.routes.reports || pathname.startsWith(`${nav.routes.reports}/`)) {
    return {
      sidebarActiveId: 'reports',
      title: null,
      showProjectActions: false,
    };
  }

  if (pathname.startsWith('/projects')) {
    return {
      sidebarActiveId: 'projects',
      title: null,
      showProjectActions: false,
    };
  }

  return {
    sidebarActiveId: 'projects',
    title: content.dashboard.title,
    showProjectActions: true,
  };
}
