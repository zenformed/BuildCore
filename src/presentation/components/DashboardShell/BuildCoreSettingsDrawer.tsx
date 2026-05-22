'use client';

import { useMemo, type ReactElement } from 'react';
import {
  pickOrganizationSettingsDrawerClassNames,
  useZenformedUserSettings,
  userSettingsToViewModelOverrides,
  ZenformedOrganizationSettingsDrawer,
  type OrganizationSettingsPersistence,
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
  getAccessToken: () => string | null;
};

export function BuildCoreSettingsDrawer({
  open,
  onClose,
  shellContext,
  getAccessToken,
}: BuildCoreSettingsDrawerProps): ReactElement | null {
  const userSettings = useZenformedUserSettings({
    settingsApiUrl: nav.apis.usersMeSettings,
    getAccessToken,
    enabled: open,
  });

  const viewModelOverrides = useMemo(
    () =>
      userSettings.settings != null
        ? userSettingsToViewModelOverrides(userSettings.settings)
        : undefined,
    [userSettings.settings]
  );

  const persistence = useMemo((): OrganizationSettingsPersistence => ({
    isLoading: userSettings.isLoading,
    loadError: userSettings.loadError,
    hasLiveData: userSettings.hasLiveData,
    accountSaveStatus: userSettings.accountSaveStatus,
    notificationsSaveStatus: userSettings.notificationsSaveStatus,
    saveErrorMessage: userSettings.saveErrorMessage,
    onSaveAccount: userSettings.saveAccount,
    onSaveNotifications: userSettings.saveNotifications,
  }), [
    userSettings.isLoading,
    userSettings.loadError,
    userSettings.hasLiveData,
    userSettings.accountSaveStatus,
    userSettings.notificationsSaveStatus,
    userSettings.saveErrorMessage,
    userSettings.saveAccount,
    userSettings.saveNotifications,
  ]);

  return (
    <ZenformedOrganizationSettingsDrawer
      open={open}
      onClose={onClose}
      classNames={drawerClassNames}
      title={nav.settingsDrawer.title}
      closeAriaLabel={nav.settingsDrawer.closeAriaLabel}
      shellContext={shellContext}
      viewModelOverrides={viewModelOverrides}
      persistence={persistence}
      showMockNote
    />
  );
}
