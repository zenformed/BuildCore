import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

/** e.g. "DanCo Project Financial Report" using organization display name from branding. */
export function buildProjectProfitAndLossReportTitle(organizationName: string): string {
  const name = organizationName.trim() || buildcoreAppDefinition.displayName;
  return `${name} Project Financial Report`;
}
