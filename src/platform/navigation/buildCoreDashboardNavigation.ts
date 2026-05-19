import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

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
  },
  routes: {
    dashboard: buildcoreAppDefinition.dashboardRoute ?? '/dashboard',
    home: '/',
    projectDetail: (slug: string): string => `/projects/${slug}`,
    projectWorkflowTasks: (slug: string): string => `/projects/${slug}/tasks`,
    projectDocuments: (slug: string): string => `/projects/${slug}/documents`,
    projectAccountability: (slug: string): string => `/projects/${slug}/accountability`,
    projectFinancials: (slug: string): string => `/projects/${slug}/financials`,
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    items: [
      { id: 'projects' as const, label: 'Projects', title: 'All projects' },
      { id: 'overview' as const, label: 'Overview', title: 'Overview' },
    ],
  },
  header: {
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
