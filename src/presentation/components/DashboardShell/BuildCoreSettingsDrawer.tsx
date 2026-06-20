'use client';

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useOrganizationLogoUpload } from '@zenformed/core/dashboard-shell';
import {
  brandingProfileToViewModelOverrides,
  mergeViewModelOverrides,
  useZenformedOrganizationBranding,
  useZenformedOrganizationWorkspace,
  useZenformedUserSettings,
  workspaceSnapshotToViewModelOverrides,
  userSettingsToViewModelOverrides,
  DEFAULT_ORGANIZATION_SETTINGS_LABELS,
  ZenformedOrganizationSettingsOverlay,
  type OrganizationSettingsPersistence,
  type OrganizationSettingsShellContext,
} from '@zenformed/core/organization-settings';
import {
  buildCoreDashboardNavigation as nav,
} from '@/platform/navigation/buildCoreDashboardNavigation';
import { env } from '@/infrastructure/config/env';
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
  const [cancelingAppSlug, setCancelingAppSlug] = useState<string | null>(null);
  const [reactivatingAppSlug, setReactivatingAppSlug] = useState<string | null>(null);
  const [removingScheduledChangeAppSlug, setRemovingScheduledChangeAppSlug] = useState<string | null>(null);
  const [cancelSubscriptionError, setCancelSubscriptionError] = useState<string | null>(null);

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
      appEntitlements: nav.apis.organizationAppEntitlements,
      memberRole: nav.apis.organizationMemberRole,
    },
    getAccessToken,
    enabled: open,
  });

  const handleManageAppSubscription = useCallback((appSlug: string) => {
    onClose();
    const platformOrigin = env.platformPublicAppUrl.replace(/\/+$/, '');
    window.location.assign(`${platformOrigin}/products/${encodeURIComponent(appSlug)}`);
  }, [onClose]);

  const handleCancelAppSubscription = useCallback(
    async (appSlug: string) => {
      const token = getAccessToken()?.trim() ?? '';
      if (!token) return false;
      setCancelSubscriptionError(null);
      setCancelingAppSlug(appSlug);
      try {
        const res = await fetch(nav.apis.cancelAppSubscription, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productSlug: appSlug }),
        });
        if (!res.ok) {
          setCancelSubscriptionError(DEFAULT_ORGANIZATION_SETTINGS_LABELS.cancelSubscriptionFailed);
          return false;
        }
        await orgWorkspace.refetch();
        return true;
      } catch {
        setCancelSubscriptionError(DEFAULT_ORGANIZATION_SETTINGS_LABELS.cancelSubscriptionFailed);
        return false;
      } finally {
        setCancelingAppSlug(null);
      }
    },
    [getAccessToken, orgWorkspace.refetch]
  );

  const handleReactivateAppSubscription = useCallback(
    async (appSlug: string) => {
      const token = getAccessToken()?.trim() ?? '';
      if (!token) return false;
      setReactivatingAppSlug(appSlug);
      try {
        const res = await fetch(nav.apis.reactivateAppSubscription, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productSlug: appSlug }),
        });
        if (!res.ok) {
          return false;
        }
        await orgWorkspace.refetch();
        return true;
      } catch {
        return false;
      } finally {
        setReactivatingAppSlug(null);
      }
    },
    [getAccessToken, orgWorkspace.refetch]
  );

  const handleRemoveScheduledPlanChange = useCallback(
    async (appSlug: string) => {
      const token = getAccessToken()?.trim() ?? '';
      if (!token) return false;
      setRemovingScheduledChangeAppSlug(appSlug);
      try {
        const res = await fetch(nav.apis.removeScheduledPlanChange, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productSlug: appSlug }),
        });
        if (!res.ok) {
          return false;
        }
        await orgWorkspace.refetch();
        return true;
      } catch {
        return false;
      } finally {
        setRemovingScheduledChangeAppSlug(null);
      }
    },
    [getAccessToken, orgWorkspace.refetch]
  );

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
      inviteMutationSuccessMessage: orgWorkspace.inviteMutationSuccessMessage,
      onDismissCreatedInviteLink: orgWorkspace.clearCreatedInviteAcceptUrl,
      onDismissInviteMutationSuccess: orgWorkspace.clearInviteMutationSuccessMessage,
      onCreateInvite: orgWorkspace.createInvite,
      onCancelInvite: orgWorkspace.cancelInvite,
      onUpdateMemberRole: orgWorkspace.updateMemberRole,
      onUpdateMemberProfile: orgWorkspace.updateMemberProfile,
      onRemoveMember: orgWorkspace.removeMember,
      currentUserRole: orgWorkspace.snapshot?.membershipContext?.role ?? null,
      onManageAppSubscription: handleManageAppSubscription,
      onCancelAppSubscription: handleCancelAppSubscription,
      onReactivateAppSubscription: handleReactivateAppSubscription,
      onRemoveScheduledPlanChange: handleRemoveScheduledPlanChange,
      cancelingAppSlug,
      reactivatingAppSlug,
      removingScheduledChangeAppSlug,
      cancelSubscriptionError,
      onDismissCancelSubscriptionError: () => setCancelSubscriptionError(null),
      appBillingIconBaseUrl: env.platformPublicAppUrl,
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
    orgWorkspace.inviteMutationSuccessMessage,
    orgWorkspace.clearCreatedInviteAcceptUrl,
    orgWorkspace.clearInviteMutationSuccessMessage,
    orgWorkspace.createInvite,
    orgWorkspace.cancelInvite,
    orgWorkspace.updateMemberRole,
    orgWorkspace.updateMemberProfile,
    orgWorkspace.removeMember,
    handleManageAppSubscription,
    handleCancelAppSubscription,
    handleReactivateAppSubscription,
    handleRemoveScheduledPlanChange,
    cancelingAppSlug,
    reactivatingAppSlug,
    removingScheduledChangeAppSlug,
    cancelSubscriptionError,
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
