import type { ZenformedAppRegistryEntry } from '@zenformed/core/dashboard-shell';
import { env } from '@/infrastructure/config/env';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

const platformDashboardHref = `${env.platformPublicAppUrl}/dashboard`;

/** Cross-app registry for the shared Zenformed apps launcher (BuildCore shell). */
export const BUILDCORE_ZENFORMED_APPS: readonly ZenformedAppRegistryEntry[] = [
  {
    id: 'platform',
    name: 'Zenformed Home',
    description: 'Platform home, account, and organization settings.',
    href: platformDashboardHref,
    status: 'live',
  },
  {
    id: 'buildcore',
    name: buildcoreAppDefinition.displayName,
    description: 'Construction project management and CRM.',
    href: buildcoreAppDefinition.dashboardRoute ?? '/dashboard',
    status: 'live',
  },
  {
    id: 'forgecore',
    name: 'ForgeCore',
    description: 'Shop operations and work orders.',
    status: 'coming_soon',
  },
  {
    id: 'formcore',
    name: 'FormCore',
    description: 'Forms and workflow automation.',
    status: 'coming_soon',
  },
];

export const BUILDCORE_LAUNCH_TARGET_APPS = ['buildcore', 'forgecore', 'formcore'] as const;

export type BuildCoreLaunchTargetApp = (typeof BUILDCORE_LAUNCH_TARGET_APPS)[number];

export function isBuildCoreLaunchTargetApp(value: string): value is BuildCoreLaunchTargetApp {
  return (BUILDCORE_LAUNCH_TARGET_APPS as readonly string[]).includes(value);
}
