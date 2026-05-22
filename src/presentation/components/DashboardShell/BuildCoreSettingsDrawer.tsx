'use client';

import type { ReactElement } from 'react';
import {
  pickOrganizationSettingsDrawerClassNames,
  ZenformedOrganizationSettingsDrawer,
  type OrganizationSettingsShellContext,
} from '@zenformed/core/organization-settings';
import {
  buildCoreDashboardNavigation as nav,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

const drawerClassNames = pickOrganizationSettingsDrawerClassNames(styles);

export type BuildCoreSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  shellContext?: OrganizationSettingsShellContext | null;
};

export function BuildCoreSettingsDrawer({
  open,
  onClose,
  shellContext,
}: BuildCoreSettingsDrawerProps): ReactElement | null {
  return (
    <ZenformedOrganizationSettingsDrawer
      open={open}
      onClose={onClose}
      classNames={drawerClassNames}
      title={nav.settingsDrawer.title}
      closeAriaLabel={nav.settingsDrawer.closeAriaLabel}
      shellContext={shellContext}
    />
  );
}
