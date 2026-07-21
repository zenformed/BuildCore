import { buildCoreDashboardNavigation } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  buildProjectDetailRoutes,
  type ProjectDetailRouteParams,
} from '@/platform/navigation/projectDetailRoutes';
import type { BuildCoreNavigation } from '@/platform/navigation/buildCoreNavigationTypes';

const DEMO_PREFIX = '/demo';

function prefixProjectDetailRoutes(params: ProjectDetailRouteParams) {
  const routes = buildProjectDetailRoutes(params);
  const prefix = (path: string): string => `${DEMO_PREFIX}${path}`;
  return {
    detail: prefix(routes.detail),
    workflowTasks: prefix(routes.workflowTasks),
    documents: prefix(routes.documents),
    accountability: prefix(routes.accountability),
    financials: prefix(routes.financials),
    budget: prefix(routes.budget),
    subproject: (childSlug: string) =>
      prefix(routes.subproject(childSlug)),
  };
}

/**
 * Navigation surface for the interactive demo runtime.
 * Reuses production labels and APIs; route targets are isolated under `/demo`.
 */
export const buildCoreDemoNavigation: BuildCoreNavigation = {
  ...buildCoreDashboardNavigation,
  routes: {
    ...buildCoreDashboardNavigation.routes,
    dashboard: `${DEMO_PREFIX}/dashboard`,
    reports: `${DEMO_PREFIX}/reports`,
    photos: `${DEMO_PREFIX}/reports/photos`,
    map: `${DEMO_PREFIX}/reports/map`,
    teams: `${DEMO_PREFIX}/teams`,
    workflowStages: `${DEMO_PREFIX}/workflow-settings`,
    home: DEMO_PREFIX,
    projectDetail: (slug: string): string => `${DEMO_PREFIX}/projects/${slug}`,
    projectSubDetail: (parentSlug: string, subSlug: string): string =>
      `${DEMO_PREFIX}/projects/${parentSlug}/${subSlug}`,
    projectRoutes: prefixProjectDetailRoutes,
    projectWorkflowTasks: (slug: string): string => `${DEMO_PREFIX}/projects/${slug}/tasks`,
    projectDocuments: (slug: string): string => `${DEMO_PREFIX}/projects/${slug}/documents`,
    projectAccountability: (slug: string): string => `${DEMO_PREFIX}/projects/${slug}/accountability`,
    projectFinancials: (slug: string): string => `${DEMO_PREFIX}/projects/${slug}/financials`,
    notifications: `${DEMO_PREFIX}/notifications`,
    myTaskDetail: (taskId: string): string =>
      `${DEMO_PREFIX}/dashboard/tasks/${encodeURIComponent(taskId)}`,
  },
  sidebar: {
    ...buildCoreDashboardNavigation.sidebar,
    items: buildCoreDashboardNavigation.sidebar.items.filter(
      (item) =>
        item.id === 'projects' ||
        item.id === 'reports' ||
        item.id === 'photos' ||
        item.id === 'map' ||
        item.id === 'workflowStages' ||
        item.id === 'teams'
    ),
  },
};
