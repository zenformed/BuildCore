import type { ProjectDetailRouteParams, ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { buildCoreDashboardNavigation } from '@/platform/navigation/buildCoreDashboardNavigation';

export type BuildCoreNavigation = {
  readonly apis: (typeof buildCoreDashboardNavigation)['apis'];
  readonly routes: {
    readonly dashboard: string;
    readonly login: string;
    readonly forgotPassword: string;
    readonly resetPassword: string;
    readonly reports: string;
    readonly teams: string;
    readonly workflowStages: string;
    readonly home: string;
    readonly projectDetail: (slug: string) => string;
    readonly projectSubDetail: (parentSlug: string, subSlug: string) => string;
    readonly projectRoutes: (params: ProjectDetailRouteParams) => ProjectDetailRoutes;
    readonly projectWorkflowTasks: (slug: string) => string;
    readonly projectDocuments: (slug: string) => string;
    readonly projectAccountability: (slug: string) => string;
    readonly projectFinancials: (slug: string) => string;
  };
  readonly sidebar: {
    readonly ariaLabel: string;
    readonly items: ReadonlyArray<{
      readonly id: 'projects' | 'reports' | 'teams' | 'workflowStages';
      readonly label: string;
      readonly title: string;
    }>;
  };
  readonly header: (typeof buildCoreDashboardNavigation)['header'];
  readonly settingsDrawer: (typeof buildCoreDashboardNavigation)['settingsDrawer'];
  readonly modals: (typeof buildCoreDashboardNavigation)['modals'];
};

export const buildCoreLiveNavigation: BuildCoreNavigation = buildCoreDashboardNavigation;
