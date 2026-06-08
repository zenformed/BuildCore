'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BuildCoreRolePermissionsSection } from './BuildCoreRolePermissionsSection';

export type BuildCorePaymentPermissionsSectionProps = {
  readonly enabled: boolean;
  readonly layout?: 'accordion' | 'tabPanel';
};

export function BuildCorePaymentPermissionsSection({
  enabled,
  layout = 'accordion',
}: BuildCorePaymentPermissionsSectionProps): ReactElement {
  const copy = content.teams.paymentPermissions;
  return (
    <BuildCoreRolePermissionsSection
      domain="payments"
      enabled={enabled}
      headingId="teams-payment-permissions-heading"
      copy={copy}
      layout={layout}
    />
  );
}
