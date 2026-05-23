'use client';

import { useCallback, useMemo, type ReactElement } from 'react';
import { useOrganizationLogoUpload } from '@zenformed/core/dashboard-shell';
import {
  brandingProfileToViewModelOverrides,
  mergeViewModelOverrides,
  useZenformedOrganizationBranding,
  useZenformedOrganizationWorkspace,
  useZenformedUserSettings,
  workspaceSnapshotToViewModelOverrides,
  userSettingsToViewModelOverrides,
  ZenformedOrganizationSettingsOverlay,
  type OrganizationSettingsPersistence,
  type OrganizationSettingsShellContext,
} from '@zenformed/core/organization-settings';
import {
  buildCoreDashboardNavigation as nav,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import { useBrandingContext } from '@/presentation/providers/BrandingProvider';

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

  const orgWorkspace = useZenformedOrganizationWorkspace({
    apiUrls: {
      members: nav.apis.organizationMembers,
      invites: nav.apis.organizationInvites,
      seats: nav.apis.organizationSeats,
      appAccess: nav.apis.organizationAppAccess,
    },
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
          : undefined,
        orgWorkspace.snapshot != null
          ? workspaceSnapshotToViewModelOverrides(orgWorkspace.snapshot)
          : undefined
      ),
    [userSettings.settings, orgBranding.profile, orgWorkspace.snapshot]
  );

  const persistence = useMemo((): OrganizationSettingsPersistence => ({
    isLoading: userSettings.isLoading,
    loadError: userSettings.loadError ?? orgBranding.loadError,
    hasLiveData: userSettings.hasLiveData || orgBranding.hasLiveData || orgWorkspace.hasLiveData,
    accountSaveStatus: userSettings.accountSaveStatus,
    notificationsSaveStatus: userSettings.notificationsSaveStatus,
    saveErrorMessage: userSettings.saveErrorMessage,
    onSaveAccount: userSettings.saveAccount,
    onSaveNotifications: userSettings.saveNotifications,
    branding: {
      isLoading: orgBranding.isLoading,
      loadError: orgBranding.loadError,
      hasLiveData: orgBranding.hasLiveData,
      canEditOrganizationProfile: orgBranding.profile?.canEditOrganizationProfile ?? false,
      profileSaveStatus: orgBranding.profileSaveStatus,
      saveErrorMessage: orgBranding.saveErrorMessage,
      logoUploading: logoUpload.logoUploading,
      onSaveOrganizationProfile: orgBranding.saveOrganizationProfile,
      onUploadLogoClick: () => logoUpload.headerLogoFileInputRef.current?.click(),
      logoInputRef: logoUpload.headerLogoFileInputRef,
      onLogoFileChange: logoUpload.handleLogoFileChange,
    },
    workspace: {
      isLoading: orgWorkspace.isLoading,
      loadError: orgWorkspace.loadError,
      hasLiveData: orgWorkspace.hasLiveData,
      snapshot: orgWorkspace.snapshot,
      inviteActionsDisabled: !orgWorkspace.hasLiveData,
      isCreatingInvite: orgWorkspace.isCreatingInvite,
      cancelingInviteId: orgWorkspace.cancelingInviteId,
      inviteMutationError: orgWorkspace.inviteMutationError,
      createdInviteAcceptUrl: orgWorkspace.createdInviteAcceptUrl,
      onDismissCreatedInviteLink: orgWorkspace.clearCreatedInviteAcceptUrl,
      onCreateInvite: orgWorkspace.createInvite,
      onCancelInvite: orgWorkspace.cancelInvite,
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
    orgBranding.profile?.canEditOrganizationProfile,
    orgBranding.profileSaveStatus,
    orgBranding.saveErrorMessage,
    orgBranding.saveOrganizationProfile,
    logoUpload.logoUploading,
    logoUpload.headerLogoFileInputRef,
    logoUpload.handleLogoFileChange,
    orgWorkspace.isLoading,
    orgWorkspace.loadError,
    orgWorkspace.hasLiveData,
    orgWorkspace.snapshot,
    orgWorkspace.isCreatingInvite,
    orgWorkspace.cancelingInviteId,
    orgWorkspace.inviteMutationError,
    orgWorkspace.createdInviteAcceptUrl,
    orgWorkspace.clearCreatedInviteAcceptUrl,
    orgWorkspace.createInvite,
    orgWorkspace.cancelInvite,
  ]);

  return (
    <ZenformedOrganizationSettingsOverlay
      open={open}
      onClose={onClose}
      title={nav.settingsDrawer.title}
      closeAriaLabel={nav.settingsDrawer.closeAriaLabel}
      shellContext={shellContext}
      viewModelOverrides={viewModelOverrides}
      persistence={persistence}
      showMockNote
    />
  );
}
