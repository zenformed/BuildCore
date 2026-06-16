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
import { buildCoreAppIconSrc } from '@/platform/assets/buildCoreAppIcon';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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
  sidebarActiveId: BuildCoreSidebarNavId;
  onSidebarSelect: (id: BuildCoreSidebarNavId) => void;
  children: ReactNode;
};

export function BuildCoreDashboardShell({
  title,
  sidebarActiveId,
  onSidebarSelect,
  children,
}: BuildCoreDashboardShellProps): ReactElement {
  const dash = useBuildCoreDashboardContext();
  if (dash.saasProfile == null && dash.authLoading) {
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
          sidebarRail: layoutClassNames.sidebarRail,
          mainColumn: layoutClassNames.mainColumn,
        }}
        sidebar={
          <BuildCoreSidebar
            activeId={sidebarActiveId}
            onSelect={onSidebarSelect}
            canAccessTeams={dash.canAccessBuildCoreTeams}
            canAccessReports={dash.canAccessBuildCoreReports}
            canAccessWorkflowStages={dash.canAccessBuildCoreWorkflowStages}
          >
            <ZenformedSidebarBranding
              classNames={sidebarBrandingClassNames}
              appName={buildcoreAppDefinition.displayName}
              appIconSrc={buildCoreAppIconSrc()}
              appAltText={buildcoreAppDefinition.displayName}
            />
          </BuildCoreSidebar>
        }
        mainColumn={
          <>
            <CorePlatformDegradedBanner variant="overlay" />
            <BuildCoreDashboardHeader
              user={
                dash.user
                  ? { email: dash.user.email, displayName: dash.user.displayName }
                  : null
              }
              effectiveLicenseTier={dash.effectiveLicenseTier}
              organizationRoleLabel={dash.organizationRoleLabel}
              avatarUrl={null}
              avatarLoading={false}
              getAccessToken={dash.getAccessToken}
              onOpenSettings={() => dash.setSettingsOpen(true)}
              onRequestSignOutConfirm={() => dash.setSignOutModalOpen(true)}
              onRequestProfilePhotoModal={() => dash.setProfilePhotoModalOpen(true)}
              sidebarActiveId={sidebarActiveId}
              onSidebarSelect={onSidebarSelect}
              sidebarNavAccess={{
                canAccessTeams: dash.canAccessBuildCoreTeams,
                canAccessReports: dash.canAccessBuildCoreReports,
                canAccessWorkflowStages: dash.canAccessBuildCoreWorkflowStages,
              }}
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
        profilePhoto={null}
      />
    </ZenformedDashboardAppShell>
  );
}
