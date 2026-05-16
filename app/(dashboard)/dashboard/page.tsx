'use client';

import type { ReactElement } from 'react';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';
import { BuildCoreSidebar } from '@/presentation/components/DashboardShell/BuildCoreSidebar';
import {
  pickDashboardLayoutClassNames,
  pickDashboardPageLoadingClassNames,
  pickSidebarBrandingClassNames,
  ZenformedDashboardAppShell,
  ZenformedDashboardPageLoading,
  ZenformedDashboardSidebarRow,
  ZenformedSidebarBranding,
} from '@zenformed/core/dashboard-shell';
import { BuildCoreDashboardHeader } from '@/presentation/components/DashboardShell/BuildCoreDashboardHeader';
import { BuildCoreSettingsDrawer } from '@/presentation/components/DashboardShell/BuildCoreSettingsDrawer';
import { BuildCoreDashboardModals } from '@/presentation/components/DashboardShell/BuildCoreDashboardModals';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import shellStyles from './dashboard.module.css';
import localStyles from './buildCoreDashboard.module.css';

const sidebarBrandingClassNames = pickSidebarBrandingClassNames(shellStyles);
const layoutClassNames = pickDashboardLayoutClassNames(shellStyles);
const pageLoadingClassNames = pickDashboardPageLoadingClassNames(shellStyles);

export default function DashboardPage(): ReactElement {
  const dash = useBuildCoreDashboard();

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
          <BuildCoreSidebar activeId={dash.sidebarNav} onSelect={dash.setSidebarNav}>
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
            <BuildCoreDashboardHeader
              user={dash.user ? { email: dash.user.email } : null}
              effectiveLicenseTier={dash.effectiveLicenseTier}
              isAdmin={dash.isAdmin}
              avatarUrl={dash.avatarUrl}
              avatarLoading={dash.avatarLoading}
              shopName={dash.shopName}
              onOpenSettings={() => dash.setSettingsOpen(true)}
              onRequestSignOutConfirm={() => dash.setSignOutModalOpen(true)}
              onRequestProfilePhotoModal={() => dash.setProfilePhotoModalOpen(true)}
            />
            <main className={shellStyles.mainContent}>
              <h1 className={shellStyles.headerTitle}>{content.dashboard.title}</h1>
              <div className={localStyles.placeholderGrid}>
                <div className={localStyles.placeholderCard}>
                  <h3>{content.dashboard.placeholderCardTitle}</h3>
                  <p>{content.dashboard.placeholderCardBody}</p>
                </div>
                <div className={localStyles.placeholderCard}>
                  <h3>{content.dashboard.placeholderCardTitle}</h3>
                  <p>{content.dashboard.placeholderCardBody}</p>
                </div>
              </div>
            </main>
          </>
        }
      />

      <BuildCoreSettingsDrawer
        open={dash.isAdmin && dash.settingsOpen}
        activeSection={dash.settingsSection}
        onSectionChange={dash.setSettingsSection}
        onClose={() => dash.setSettingsOpen(false)}
        aboutSectionContent={
          <div>
            <h3>{content.dashboard.aboutSectionTitle}</h3>
            <p>{content.dashboard.aboutSectionBody}</p>
          </div>
        }
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
