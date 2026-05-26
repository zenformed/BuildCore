'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreRolePermissionsSection } from './BuildCoreRolePermissionsSection';

export type BuildCoreBudgetPermissionsSectionProps = {
  readonly enabled: boolean;
};

export function BuildCoreBudgetPermissionsSection({
  enabled,
}: BuildCoreBudgetPermissionsSectionProps): ReactElement {
  const copy = content.teams.budgetPermissions;
  return (
    <BuildCoreRolePermissionsSection
      domain="budget"
      enabled={enabled}
      headingId="teams-budget-permissions-heading"
      copy={copy}
    />
  );
}
