'use client';

import type { SaaSEntitlementSnapshot } from '@/application/ports';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/domain/entities/User';
import { env } from '@/infrastructure/config/env';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useBranding } from '@/presentation/hooks/useBranding';
import { useOrganizationLogoUpload } from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useUserAvatar } from '@/presentation/hooks/useUserAvatar';
import { useTenant } from '@/presentation/providers';
import { computeIsAdmin } from '@/presentation/features/buildCoreDashboard/buildCoreDashboardViewModel';
import type { BuildCoreSettingsSectionId } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmPriorityFilter, CrmStageFilter } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
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
  isAdmin: boolean;
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
  projectsSearchQuery: string;
  setProjectsSearchQuery: (query: string) => void;
  stageFilter: CrmStageFilter;
  setStageFilter: (value: CrmStageFilter) => void;
  priorityFilter: CrmPriorityFilter;
  setPriorityFilter: (value: CrmPriorityFilter) => void;
  onProjectRowClick: (project: CrmProjectSummary) => void;
  onNewProjectClick: () => void;
  createProjectDrawerOpen: boolean;
  setCreateProjectDrawerOpen: (open: boolean) => void;
} {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { shopName, logoUrl, hasLogo, isLoading: brandingLoading, refetch: refetchBranding } = useBranding();
  const { profile: saasProfile, entitlementSnapshot, session: saasSession } = useSaaSProfile();
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
  const [projectsSearchQuery, setProjectsSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<CrmStageFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<CrmPriorityFilter>('all');
  const [createProjectDrawerOpen, setCreateProjectDrawerOpen] = useState(false);

  const onProjectRowClick = useCallback(
    (project: CrmProjectSummary) => {
      router.push(nav.routes.projectDetail(project.slug));
    },
    [router]
  );

  const onNewProjectClick = useCallback(() => {
    setCreateProjectDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    }
  }, [user?.tenantId, setTenantId]);

  const effectiveLicenseTier = saasProfile?.license_tier;
  const isAdmin = computeIsAdmin(env.isSaasMode, user);

  const { logoUploading, headerLogoFileInputRef, handleLogoFileChange } = useOrganizationLogoUpload({
    brandingApiUrl: nav.apis.branding,
    getAccessToken,
    refetchBranding,
    logoSaveFailedFallback: content.branding.logoSaveFailedFallback,
  });

  return {
    user,
    saasProfile,
    authLoading,
    signOut,
    shopName,
    logoUrl,
    hasLogo,
    brandingLoading,
    effectiveLicenseTier,
    isAdmin,
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
    projectsSearchQuery,
    setProjectsSearchQuery,
    stageFilter,
    setStageFilter,
    priorityFilter,
    setPriorityFilter,
    onProjectRowClick,
    onNewProjectClick,
    createProjectDrawerOpen,
    setCreateProjectDrawerOpen,
  };
}