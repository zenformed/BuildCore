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

  const orgWorkspace = useZenformedOrganizationWorkspace({
    apiUrls: {
      membershipContext: nav.apis.organizationMembershipContext,
      members: nav.apis.organizationMembers,
      invites: nav.apis.organizationInvites,
      seats: nav.apis.organizationSeats,
      appAccess: nav.apis.organizationAppAccess,
      memberRole: nav.apis.organizationMemberRole,
    },
    getAccessToken,
    enabled: open,
  });

  const workspacePermissions = orgWorkspace.snapshot?.membershipContext?.permissions ?? null;

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
          : undefined,
        orgWorkspace.snapshot != null
          ? workspaceSnapshotToViewModelOverrides(orgWorkspace.snapshot)
          : undefined
      ),
    [userSettings.settings, orgBranding.profile, orgWorkspace.snapshot]
  );

  const canEditOrganizationProfile = orgBranding.profile?.canEditOrganizationProfile === true;

  const persistence = useMemo((): OrganizationSettingsPersistence => ({
    permissions: workspacePermissions,
    isLoading: userSettings.isLoading || orgWorkspace.isLoading,
    loadError: userSettings.loadError ?? orgBranding.loadError ?? orgWorkspace.loadError,
    hasLiveData: userSettings.hasLiveData || orgBranding.hasLiveData || orgWorkspace.hasLiveData,
    accountSaveStatus: userSettings.accountSaveStatus,
    notificationsSaveStatus: userSettings.notificationsSaveStatus,
    saveErrorMessage: userSettings.saveErrorMessage,
    onSaveAccount: userSettings.saveAccount,
    onSaveNotifications: userSettings.saveNotifications,
    forgotPasswordHref: nav.routes.forgotPassword,
    branding: {
      isLoading: orgBranding.isLoading,
      loadError: orgBranding.loadError,
      hasLiveData: orgBranding.hasLiveData,
      canEditOrganizationProfile,
      profileSaveStatus: orgBranding.profileSaveStatus,
      saveErrorMessage: orgBranding.saveErrorMessage,
      logoUploading: logoUpload.logoUploading,
      onSaveOrganizationProfile: canEditOrganizationProfile
        ? orgBranding.saveOrganizationProfile
        : undefined,
      onUploadLogoClick: canEditOrganizationProfile
        ? () => logoUpload.headerLogoFileInputRef.current?.click()
        : undefined,
      logoInputRef: canEditOrganizationProfile ? logoUpload.headerLogoFileInputRef : undefined,
      onLogoFileChange: canEditOrganizationProfile ? logoUpload.handleLogoFileChange : undefined,
    },
    workspace: {
      isLoading: orgWorkspace.isLoading,
      loadError: orgWorkspace.loadError,
      hasLiveData: orgWorkspace.hasLiveData,
      snapshot: orgWorkspace.snapshot,
      permissions: workspacePermissions,
      currentUserId: orgWorkspace.snapshot?.membershipContext?.currentUserId ?? null,
      inviteActionsDisabled: !(workspacePermissions?.canInviteMembers ?? false),
      roleManagementDisabled: !(workspacePermissions?.canManageMemberRoles ?? false),
      removeMemberDisabled: !(workspacePermissions?.canRemoveMembers ?? false),
      memberProfileEditDisabled: !(workspacePermissions?.canManageMemberProfiles ?? false),
      isCreatingInvite: orgWorkspace.isCreatingInvite,
      cancelingInviteId: orgWorkspace.cancelingInviteId,
      updatingMemberRoleId: orgWorkspace.updatingMemberRoleId,
      updatingMemberProfileId: orgWorkspace.updatingMemberProfileId,
      removingMemberId: orgWorkspace.removingMemberId,
      inviteMutationError: orgWorkspace.inviteMutationError,
      roleMutationError: orgWorkspace.roleMutationError,
      removeMemberMutationError: orgWorkspace.removeMemberMutationError,
      memberProfileMutationError: orgWorkspace.memberProfileMutationError,
      createdInviteAcceptUrl: orgWorkspace.createdInviteAcceptUrl,
      createdInviteEmailDeliveryStatus: orgWorkspace.createdInviteEmailDeliveryStatus,
      onDismissCreatedInviteLink: orgWorkspace.clearCreatedInviteAcceptUrl,
      onCreateInvite: orgWorkspace.createInvite,
      onCancelInvite: orgWorkspace.cancelInvite,
      onUpdateMemberRole: orgWorkspace.updateMemberRole,
      onUpdateMemberProfile: orgWorkspace.updateMemberProfile,
      onRemoveMember: orgWorkspace.removeMember,
      currentUserRole: orgWorkspace.snapshot?.membershipContext?.role ?? null,
    },
  }), [
    workspacePermissions,
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
    canEditOrganizationProfile,
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
    orgWorkspace.updatingMemberRoleId,
    orgWorkspace.updatingMemberProfileId,
    orgWorkspace.removingMemberId,
    orgWorkspace.inviteMutationError,
    orgWorkspace.roleMutationError,
    orgWorkspace.removeMemberMutationError,
    orgWorkspace.memberProfileMutationError,
    orgWorkspace.createdInviteAcceptUrl,
    orgWorkspace.createdInviteEmailDeliveryStatus,
    orgWorkspace.clearCreatedInviteAcceptUrl,
    orgWorkspace.createInvite,
    orgWorkspace.cancelInvite,
    orgWorkspace.updateMemberRole,
    orgWorkspace.updateMemberProfile,
    orgWorkspace.removeMember,
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
