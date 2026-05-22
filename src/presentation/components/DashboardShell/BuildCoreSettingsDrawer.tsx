'use client';

import { useCallback, useMemo, type ReactElement } from 'react';
import { useOrganizationLogoUpload } from '@zenformed/core/dashboard-shell';
import {
  brandingProfileToViewModelOverrides,
  mergeViewModelOverrides,
  pickOrganizationSettingsDrawerClassNames,
  useZenformedOrganizationBranding,
  useZenformedUserSettings,
  userSettingsToViewModelOverrides,
  ZenformedOrganizationSettingsDrawer,
  type OrganizationSettingsPersistence,
  type OrganizationSettingsShellContext,
} from '@zenformed/core/organization-settings';
import {
  buildCoreDashboardNavigation as nav,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import { useBrandingContext } from '@/presentation/providers/BrandingProvider';
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
  const { refetch: refetchShellBranding } = useBrandingContext();

  const userSettings = useZenformedUserSettings({
    settingsApiUrl: nav.apis.usersMeSettings,
    getAccessToken,
    enabled: open,
  });

  const orgBranding = useZenformedOrganizationBranding({
    brandingApiUrl: nav.apis.branding,
    brandingLogoApiUrl: '/api/branding/logo',
    getAccessToken,
    enabled: open,
  });

  const refetchBranding = useCallback(async () => {
    await orgBranding.refetch();
    await refetchShellBranding();
  }, [orgBranding, refetchShellBranding]);

  const logoUpload = useOrganizationLogoUpload({
    brandingApiUrl: nav.apis.branding,
    getAccessToken,
    refetchBranding,
    logoSaveFailedFallback: 'Logo upload failed',
  });

  const viewModelOverrides = useMemo(
    () =>
      mergeViewModelOverrides(
        userSettings.settings != null
          ? userSettingsToViewModelOverrides(userSettings.settings)
          : undefined,
        orgBranding.profile != null
          ? brandingProfileToViewModelOverrides(orgBranding.profile)
          : undefined
      ),
    [userSettings.settings, orgBranding.profile]
  );

  const persistence = useMemo((): OrganizationSettingsPersistence => ({
    isLoading: userSettings.isLoading,
    loadError: userSettings.loadError ?? orgBranding.loadError,
    hasLiveData: userSettings.hasLiveData || orgBranding.hasLiveData,
    accountSaveStatus: userSettings.accountSaveStatus,
    notificationsSaveStatus: userSettings.notificationsSaveStatus,
    saveErrorMessage: userSettings.saveErrorMessage,
    onSaveAccount: userSettings.saveAccount,
    onSaveNotifications: userSettings.saveNotifications,
    branding: {
      isLoading: orgBranding.isLoading,
      loadError: orgBranding.loadError,
      hasLiveData: orgBranding.hasLiveData,
      profileSaveStatus: orgBranding.profileSaveStatus,
      saveErrorMessage: orgBranding.saveErrorMessage,
      logoUploading: logoUpload.logoUploading,
      onSaveOrganizationProfile: orgBranding.saveOrganizationProfile,
      onUploadLogoClick: () => logoUpload.headerLogoFileInputRef.current?.click(),
      logoInputRef: logoUpload.headerLogoFileInputRef,
      onLogoFileChange: logoUpload.handleLogoFileChange,
    },
  }), [
    userSettings.isLoading,
    userSettings.loadError,
    userSettings.hasLiveData,
    userSettings.accountSaveStatus,
    userSettings.notificationsSaveStatus,
    userSettings.saveErrorMessage,
    userSettings.saveAccount,
    userSettings.saveNotifications,
    orgBranding.isLoading,
    orgBranding.loadError,
    orgBranding.hasLiveData,
    orgBranding.profileSaveStatus,
    orgBranding.saveErrorMessage,
    orgBranding.saveOrganizationProfile,
    logoUpload.logoUploading,
    logoUpload.headerLogoFileInputRef,
    logoUpload.handleLogoFileChange,
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
