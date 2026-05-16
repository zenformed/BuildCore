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
  },
  sidebar: {
    ariaLabel: 'Primary navigation',
    items: [
      { id: 'home' as const, label: 'Home', title: 'Home' },
      { id: 'overview' as const, label: 'Overview', title: 'Overview' },
    ],
  },
  header: {
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
