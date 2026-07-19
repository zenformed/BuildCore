import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { ZenformedAppIconNavMenuItem } from '@zenformed/core/dashboard-shell';
import type { BuildCoreSidebarNavId } from './BuildCoreSidebar';

export type BuildCoreSidebarNavAccess = {
  readonly canAccessTeams?: boolean;
  readonly canAccessReports?: boolean;
  readonly canAccessWorkflowStages?: boolean;
  /** Members: relabel Dashboard → My Tasks. */
  readonly isMemberExperience?: boolean;
};

export function filterBuildCoreSidebarNavItems({
  canAccessTeams = true,
  canAccessReports = true,
  canAccessWorkflowStages = true,
}: BuildCoreSidebarNavAccess = {}) {
  return nav.sidebar.items.filter((item) => {
    if (item.id === 'teams' && !canAccessTeams) return false;
    if (item.id === 'reports' && !canAccessReports) return false;
    if (item.id === 'workflowStages' && !canAccessWorkflowStages) return false;
    return true;
  });
}

export function buildBuildCoreAppIconNavMenuItems(
  activeId: BuildCoreSidebarNavId,
  onSelect: (id: BuildCoreSidebarNavId) => void,
  access: BuildCoreSidebarNavAccess = {}
): readonly ZenformedAppIconNavMenuItem[] {
  return filterBuildCoreSidebarNavItems(access).map((item) => ({
    id: item.id,
    label: item.label,
    active: activeId === item.id,
    onSelect: () => onSelect(item.id),
  }));
}
