import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import {
  buildProjectDetailRoutes,
  type ProjectDetailRouteParams,
} from '@/platform/navigation/projectDetailRoutes';

export type BuildCoreSettingsSectionId = 'about';

export const buildCoreDashboardSettingsSections = [
  { id: 'about' as const, label: 'About', groupId: 'settings-tabs' as const },
] as const;

export const buildCoreDashboardSettingsTab = {
  about: buildCoreDashboardSettingsSections[0],
} as const;

export const buildCoreDashboardNavigation = {
  apis: {
    branding: '/api/branding',
    usersMeSettings: '/api/internal/users-me-settings',
    organizationMembers: '/api/internal/organization/members',
    organizationMembershipContext: '/api/internal/organization/membership-context',
    organizationMemberRole: '/api/internal/organization/members',
    organizationInvites: '/api/internal/organization/invites',
    organizationSeats: '/api/internal/organization/seats',
    organizationAppEntitlements: '/api/internal/apps/entitlements',
    organizationAppAccess: '/api/internal/organization/app-access',
    organizationAssignmentIdentities: '/api/internal/organization/assignment-identities',
  },
  routes: {
    dashboard: buildcoreAppDefinition.dashboardRoute ?? '/dashboard',
    login: '/login',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    reports: '/reports',
    teams: '/teams',
    workflowStages: '/workflow-settings',
    home: '/',
    projectDetail: (slug: string): string => `/projects/${slug}`,
    projectSubDetail: (parentSlug: string, subSlug: string): string =>
      `/projects/${parentSlug}/${subSlug}`,
    projectRoutes: (params: ProjectDetailRouteParams) => buildProjectDetailRoutes(params),
    projectWorkflowTasks: (slug: string): string => `/projects/${slug}/tasks`,
    projectDocuments: (slug: string): string => `/projects/${slug}/documents`,
    projectAccountability: (slug: string): string => `/projects/${slug}/accountability`,
    projectFinancials: (slug: string): string => `/projects/${slug}/financials`,
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    items: [
      { id: 'projects' as const, label: 'Projects', title: 'All projects' },
      { id: 'reports' as const, label: 'Reports', title: 'CRM reports' },
      { id: 'teams' as const, label: 'Teams', title: 'Teams' },
      { id: 'workflowStages' as const, label: 'Workflow Settings', title: 'Workflow settings' },
    ],
  },
  header: {
    appsLauncher: {
      triggerAriaLabel: 'Open apps',
      popoverAriaLabel: 'Zenformed apps',
    },
    search: {
      placeholder: 'Search projects…',
      ariaLabel: 'Search projects',
    },
    newProject: {
      title: 'New project',
      ariaLabel: 'New project',
    },
    account: {
      menuTriggerAriaLabel: 'Account menu',
      planAriaLabelPrefix: 'Plan:',
      adminBadgeLabel: 'Admin',
      companyLogoChange: {
        title: 'Change company logo',
        ariaLabel: 'Change company logo',
      },
      profilePhotoChange: {
        title: 'Change profile photo',
        ariaLabel: 'Change profile photo',
      },
      settingsButton: {
        label: 'Settings',
      },
      signOutButton: {
        label: 'Sign out',
      },
    },
  },
  settingsDrawer: {
    id: 'buildcore-settings-drawer',
    title: 'Settings',
    closeAriaLabel: 'Close settings',
    groups: [{ id: 'settings-tabs' as const }],
    sections: buildCoreDashboardSettingsSections,
  },
  modals: {
    signOut: {
      title: 'Sign out?',
      message: 'You will need to sign in again to use the app.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Cancel',
    },
  },
} as const;
