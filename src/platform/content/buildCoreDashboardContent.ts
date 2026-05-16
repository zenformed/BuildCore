import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

export const buildCoreDashboardContent = {
  loading: {
    page: 'Loading…',
  },
  licenseLockout: {
    title: 'You do not have a valid license',
    message:
      'Your license key is invalid or missing. Please contact your administrator to continue.',
  },
  branding: {
    defaultShopNameFallback: buildcoreAppDefinition.displayName,
    logoSaveFailedFallback: 'Failed to save logo',
  },
  dashboard: {
    title: 'Dashboard',
    placeholderCardTitle: 'BuildCore shell',
    placeholderCardBody:
      'Authenticated placeholder — CRM features (leads, projects, workflows) are not implemented in this pass.',
    aboutSectionTitle: 'BuildCore',
    aboutSectionBody:
      'Construction/trades CRM shell: SaaS auth, ZenformedCore profile/entitlement relay, and shared dashboard chrome from @zenformed/core.',
  },
} as const;
