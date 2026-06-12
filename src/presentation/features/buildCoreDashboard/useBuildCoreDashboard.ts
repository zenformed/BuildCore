'use client';

import type { SaaSEntitlementSnapshot } from '@/application/ports';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/domain/entities/User';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useBranding } from '@/presentation/hooks/useBranding';
import { useOrganizationLogoUpload } from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useUserAvatar } from '@/presentation/hooks/useUserAvatar';
import { useTenant } from '@/presentation/providers';
import { EMPTY_ORGANIZATION_PERMISSIONS } from '@zenformed/core/organization-settings';
import { canAccessBuildCoreTeams } from '@/presentation/features/buildCoreTeams/buildCoreTeamsAccess';
import { canAccessBuildCoreReports } from '@/presentation/features/crmReports/buildCoreReportsAccess';
import { canAccessBuildCoreWorkflowStages } from '@/presentation/features/buildCoreWorkflowStages/buildCoreWorkflowStagesAccess';
import { formatOrganizationRoleLabel } from '@zenformed/core/dashboard-shell';
import type { BuildCoreSettingsSectionId } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { CrmProjectSummary } from '@/domain/crm';
import type { BuildCoreSidebarNavId } from '@/presentation/components/DashboardShell/BuildCoreSidebar';

export type { BuildCoreSidebarNavId };

export function useBuildCoreDashboard(): {
  user: User | null;
  saasProfile: ReturnType<typeof useSaaSProfile>['profile'];
  authLoading: boolean;
  signOut: () => Promise<void>;
  shopName: string;
  logoUrl: string | null;
  hasLogo: boolean;
  brandingLoading: boolean;
  effectiveLicenseTier: string | undefined;
  organizationRoleLabel: string | null;
  canAccessBuildCoreTeams: boolean;
  canAccessBuildCoreReports: boolean;
  canAccessBuildCoreWorkflowStages: boolean;
  isOrganizationPermissionsLoading: boolean;
  isAdmin: boolean;
  canEditOrganizationProfile: boolean;
  avatarUrl: string | null;
  avatarLoading: boolean;
  refetchAvatar: () => Promise<void>;
  getAccessToken: () => string | null;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsSection: BuildCoreSettingsSectionId;
  setSettingsSection: (s: BuildCoreSettingsSectionId) => void;
  signOutModalOpen: boolean;
  setSignOutModalOpen: (open: boolean) => void;
  profilePhotoModalOpen: boolean;
  setProfilePhotoModalOpen: (open: boolean) => void;
  sidebarNav: BuildCoreSidebarNavId;
  setSidebarNav: (id: BuildCoreSidebarNavId) => void;
  entitlementSnapshot: SaaSEntitlementSnapshot | null;
  hasAvatarPhoto: boolean;
  refetchBranding: () => Promise<void>;
  logoUploading: boolean;
  headerLogoFileInputRef: RefObject<HTMLInputElement>;
  handleLogoFileChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProjectRowClick: (project: CrmProjectSummary) => void;
} {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { shopName, logoUrl, hasLogo, isLoading: brandingLoading, refetch: refetchBranding } = useBranding();
  const {
    profile: saasProfile,
    entitlementSnapshot,
    session: saasSession,
    organizationMembershipContext,
    membershipContextStatus,
  } = useSaaSProfile();
  const { setTenantId } = useTenant();

  const saasSessionRef = useRef(saasSession);
  saasSessionRef.current = saasSession;
  const getAccessToken = useCallback(
    (): string | null => (env.isSaasMode ? saasSessionRef.current?.access_token ?? null : null),
    []
  );

  const { avatarUrl, hasPhoto: hasAvatarPhoto, isLoading: avatarLoading, refetch: refetchAvatar } = useUserAvatar(
    user,
    getAccessToken
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<BuildCoreSettingsSectionId>('about');
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [profilePhotoModalOpen, setProfilePhotoModalOpen] = useState(false);
  const [sidebarNav, setSidebarNav] = useState<BuildCoreSidebarNavId>('projects');

  const onProjectRowClick = useCallback(
    (project: CrmProjectSummary) => {
      router.push(nav.routes.projectDetail(project.slug));
    },
    [router]
  );

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    }
  }, [user?.tenantId, setTenantId]);

  const effectiveLicenseTier = entitlementSnapshot?.licenseTier ?? saasProfile?.license_tier;
  const organizationRoleLabel = formatOrganizationRoleLabel(organizationMembershipContext?.role);
  const organizationPermissions =
    organizationMembershipContext?.permissions ?? EMPTY_ORGANIZATION_PERMISSIONS;
  const canEditOrganizationProfile = organizationPermissions.canEditOrganizationProfile;
  const isAdmin = env.isSaasMode ? Boolean(user) : false;

  const canAccessBuildCoreTeamsNav = useMemo(() => {
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      return true;
    }
    if (membershipContextStatus !== 'ready') {
      return false;
    }
    return canAccessBuildCoreTeams({
      role: organizationMembershipContext?.role,
      permissions: organizationMembershipContext?.permissions ?? null,
    });
  }, [
    organizationMembershipContext?.permissions,
    organizationMembershipContext?.role,
    membershipContextStatus,
  ]);

  const canAccessBuildCoreReportsNav = useMemo(() => {
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      return true;
    }
    if (membershipContextStatus !== 'ready') {
      return false;
    }
    return canAccessBuildCoreReports(organizationMembershipContext?.role);
  }, [membershipContextStatus, organizationMembershipContext?.role]);

  const canAccessBuildCoreWorkflowStagesNav = useMemo(() => {
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      return true;
    }
    if (membershipContextStatus !== 'ready') {
      return false;
    }
    return canAccessBuildCoreWorkflowStages(organizationMembershipContext?.role);
  }, [membershipContextStatus, organizationMembershipContext?.role]);

  const isOrganizationPermissionsLoading = useMemo(() => {
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      return false;
    }
    return membershipContextStatus === 'pending';
  }, [membershipContextStatus]);

  const { logoUploading, headerLogoFileInputRef, handleLogoFileChange } = useOrganizationLogoUpload({
    brandingApiUrl: nav.apis.branding,
    getAccessToken,
    refetchBranding,
    logoSaveFailedFallback: content.branding.logoSaveFailedFallback,
  });

  return useMemo(
    () => ({
      user,
      saasProfile,
      authLoading,
      signOut,
      shopName,
      logoUrl,
      hasLogo,
      brandingLoading,
      effectiveLicenseTier,
      organizationRoleLabel,
      canAccessBuildCoreTeams: canAccessBuildCoreTeamsNav,
      canAccessBuildCoreReports: canAccessBuildCoreReportsNav,
      canAccessBuildCoreWorkflowStages: canAccessBuildCoreWorkflowStagesNav,
      isOrganizationPermissionsLoading,
      isAdmin,
      canEditOrganizationProfile,
      avatarUrl,
      avatarLoading,
      refetchAvatar,
      getAccessToken,
      settingsOpen,
      setSettingsOpen,
      settingsSection,
      setSettingsSection,
      signOutModalOpen,
      setSignOutModalOpen,
      profilePhotoModalOpen,
      setProfilePhotoModalOpen,
      sidebarNav,
      setSidebarNav,
      entitlementSnapshot,
      hasAvatarPhoto,
      refetchBranding,
      logoUploading,
      headerLogoFileInputRef,
      handleLogoFileChange,
      onProjectRowClick,
    }),
    [
      authLoading,
      avatarLoading,
      avatarUrl,
      brandingLoading,
      canAccessBuildCoreReportsNav,
      canAccessBuildCoreTeamsNav,
      canAccessBuildCoreWorkflowStagesNav,
      isOrganizationPermissionsLoading,
      effectiveLicenseTier,
      entitlementSnapshot,
      getAccessToken,
      handleLogoFileChange,
      hasAvatarPhoto,
      hasLogo,
      headerLogoFileInputRef,
      isAdmin,
      canEditOrganizationProfile,
      logoUploading,
      logoUrl,
      onProjectRowClick,
      organizationRoleLabel,
      profilePhotoModalOpen,
      refetchAvatar,
      refetchBranding,
      saasProfile,
      settingsOpen,
      settingsSection,
      shopName,
      sidebarNav,
      signOut,
      signOutModalOpen,
      user,
    ]
  );
}