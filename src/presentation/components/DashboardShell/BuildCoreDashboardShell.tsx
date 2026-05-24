'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  pickDashboardLayoutClassNames,
  pickDashboardPageLoadingClassNames,
  pickSidebarBrandingClassNames,
  ZenformedDashboardAppShell,
  ZenformedDashboardPageLoading,
  ZenformedDashboardSidebarRow,
  ZenformedSidebarBranding,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { BuildCoreDashboardHeader } from './BuildCoreDashboardHeader';
import { BuildCoreDashboardModals } from './BuildCoreDashboardModals';
import { BuildCoreSettingsDrawer } from './BuildCoreSettingsDrawer';
import { BuildCoreSidebar, type BuildCoreSidebarNavId } from './BuildCoreSidebar';
import { CorePlatformDegradedBanner } from '@/presentation/components/CorePlatform/CorePlatformDegradedBanner';
import { CurrentUserAvatarProvider } from '@/presentation/providers/CurrentUserAvatarContext';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

const sidebarBrandingClassNames = pickSidebarBrandingClassNames(shellStyles);
const layoutClassNames = pickDashboardLayoutClassNames(shellStyles);
const pageLoadingClassNames = pickDashboardPageLoadingClassNames(shellStyles);

export type BuildCoreDashboardShellProps = {
  /** When null, the shell omits the page h1 (detail pages use their own header). */
  title: string | null;
  showProjectActions: boolean;
  sidebarActiveId: BuildCoreSidebarNavId;
  onSidebarSelect: (id: BuildCoreSidebarNavId) => void;
  children: ReactNode;
};

export function BuildCoreDashboardShell({
  title,
  showProjectActions,
  sidebarActiveId,
  onSidebarSelect,
  children,
}: BuildCoreDashboardShellProps): ReactElement {
  const dash = useBuildCoreDashboardContext();
  if (dash.authLoading && dash.saasProfile == null) {
    return (
      <ZenformedDashboardPageLoading classNames={pageLoadingClassNames} message={content.loading.page} />
    );
  }

  if (dash.entitlementSnapshot && !dash.entitlementSnapshot.subscriptionActive) {
    return (
      <div className={shellStyles.page}>
        <h1>{content.licenseLockout.title}</h1>
        <p>{content.licenseLockout.message}</p>
      </div>
    );
  }

  return (
    <ZenformedDashboardAppShell classNames={{ appLayout: layoutClassNames.appLayout }}>
      <ZenformedDashboardSidebarRow
        classNames={{
          dashboardWithSidebar: layoutClassNames.dashboardWithSidebar,
          mainColumn: layoutClassNames.mainColumn,
        }}
        sidebar={
          <BuildCoreSidebar activeId={sidebarActiveId} onSelect={onSidebarSelect}>
            <ZenformedSidebarBranding
              classNames={sidebarBrandingClassNames}
              shopName={dash.shopName}
              defaultShopNameFallback={content.branding.defaultShopNameFallback}
              logoUrl={dash.logoUrl}
              brandingLoading={dash.brandingLoading}
              logoUploading={dash.logoUploading}
              showCameraButton={dash.isAdmin}
              fileInputRef={dash.headerLogoFileInputRef}
              onLogoFileChange={(e) => {
                void dash.handleLogoFileChange(e);
              }}
              companyLogoChangeTitle={nav.header.account.companyLogoChange.title}
              companyLogoChangeAriaLabel={nav.header.account.companyLogoChange.ariaLabel}
            />
          </BuildCoreSidebar>
        }
        mainColumn={
          <>
            <CorePlatformDegradedBanner variant="overlay" />
            <BuildCoreDashboardHeader
              searchQuery={dash.projectsSearchQuery}
              onSearchQueryChange={dash.setProjectsSearchQuery}
              showProjectActions={showProjectActions}
              onNewProjectClick={dash.onNewProjectClick}
              newProjectDisabled={dash.createProjectDraftOpen}
              user={dash.user ? { email: dash.user.email } : null}
              effectiveLicenseTier={dash.effectiveLicenseTier}
              organizationRoleLabel={dash.organizationRoleLabel}
              isAdmin={dash.isAdmin}
              avatarUrl={dash.avatarUrl}
              avatarLoading={dash.avatarLoading}
              shopName={dash.shopName}
              onOpenSettings={() => dash.setSettingsOpen(true)}
              onRequestSignOutConfirm={() => dash.setSignOutModalOpen(true)}
              onRequestProfilePhotoModal={() => dash.setProfilePhotoModalOpen(true)}
            />
            <main className={shellStyles.mainContent}>
              {title != null ? <h1 className={shellStyles.headerTitle}>{title}</h1> : null}
              <CurrentUserAvatarProvider
                currentUserId={dash.user?.id ?? null}
                currentUserAvatarUrl={dash.avatarUrl}
              >
                <div className={shellStyles.listViewWrap}>{children}</div>
              </CurrentUserAvatarProvider>
            </main>
          </>
        }
      />

      <BuildCoreSettingsDrawer
        open={dash.settingsOpen}
        onClose={() => dash.setSettingsOpen(false)}
        getAccessToken={dash.getAccessToken}
        shellContext={{
          userEmail: dash.user?.email ?? null,
          organizationName: dash.shopName ?? null,
          logoUrl: dash.logoUrl ?? null,
        }}
      />

      <BuildCoreDashboardModals
        signOut={{
          isOpen: dash.signOutModalOpen,
          onClose: () => dash.setSignOutModalOpen(false),
          onConfirm: async () => {
            await dash.signOut();
          },
        }}
        profilePhoto={
          dash.user
            ? {
                isOpen: dash.profilePhotoModalOpen,
                onClose: () => dash.setProfilePhotoModalOpen(false),
                userEmail: dash.user.email,
                avatarUrl: dash.avatarUrl,
                hasPhoto: dash.hasAvatarPhoto,
                onSuccess: () => {
                  void dash.refetchAvatar();
                },
                getAccessToken: dash.getAccessToken,
              }
            : null
        }
      />
    </ZenformedDashboardAppShell>
  );
}
