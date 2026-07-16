'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import {
  pickAppsLauncherClassNames,
  pickDashboardPageLoadingClassNames,
  pickHeaderShellClassNames,
  useZenformedAppLaunch,
  useZenformedShellUserDisplay,
  ZenformedAppsLauncher,
  ZenformedCollapsibleSidebarShell,
  ZenformedDashboardAppShell,
  ZenformedDashboardPageLoading,
  ZenformedSidebarAppsTriggerChrome,
  resolveAccountMenuUser,
  type ZenformedAccountMenuLabels,
  type ZenformedAppRegistryEntry,
} from '@zenformed/core/dashboard-shell';
import { formatPlanDisplayName, resolveAppEntitlementBadges } from '@zenformed/core/organization-settings';
import { buildCoreAppIconSrc } from '@/platform/assets/buildCoreAppIcon';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { BUILDCORE_ZENFORMED_APPS } from '@/platform/appDefinitions/zenformedApps';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  AppsIcon,
  CameraIcon,
  SettingsIcon,
  SignOutIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import { useTheme } from '@/presentation/providers/ThemeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useOptionalDemoMode } from '@/presentation/providers/DemoModeProvider';
import { CurrentUserAvatarProvider } from '@/presentation/providers/CurrentUserAvatarContext';
import { useBuildCoreNotificationsConfig } from '@/presentation/features/notifications/useBuildCoreNotificationsConfig';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { CorePlatformDegradedBanner } from '@/presentation/components/CorePlatform/CorePlatformDegradedBanner';
import { DemoDisabledAppsLauncher } from '@/presentation/components/Demo/DemoDisabledShellControls';
import { BuildCoreDashboardModals } from './BuildCoreDashboardModals';
import { BuildCoreSettingsDrawer } from './BuildCoreSettingsDrawer';
import { buildBuildCoreSidebarSections } from './buildBuildCoreSidebarSections';
import { BuildCoreSidebarTeamSection } from './BuildCoreSidebarTeamSection';
import type { BuildCoreSidebarNavId } from './BuildCoreSidebar';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import appsStyles from './buildCorePlatformApps.module.css';

const headerShellClassNames = pickHeaderShellClassNames(shellStyles);
const appsLauncherClassNames = pickAppsLauncherClassNames(appsStyles);
const pageLoadingClassNames = pickDashboardPageLoadingClassNames(shellStyles);

const accountMenuLabels: ZenformedAccountMenuLabels = {
  menuTriggerAriaLabel: nav.header.account.menuTriggerAriaLabel,
  planAriaLabelPrefix: nav.header.account.planAriaLabelPrefix,
  adminBadgeLabel: nav.header.account.adminBadgeLabel,
  roleAriaLabelPrefix: 'Role:',
  profilePhotoChangeTitle: nav.header.account.profilePhotoChange.title,
  profilePhotoChangeAriaLabel: nav.header.account.profilePhotoChange.ariaLabel,
  settingsButtonLabel: nav.header.account.settingsButton.label,
  signOutButtonLabel: nav.header.account.signOutButton.label,
};

const appsLauncherLabels = {
  triggerAriaLabel: nav.header.appsLauncher.triggerAriaLabel,
  popoverAriaLabel: nav.header.appsLauncher.popoverAriaLabel,
  appsSectionTitle: 'Apps',
  accountSectionTitle: 'Account',
  accountHomeLabel: 'Zenformed Home',
};

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
  const demoMode = useOptionalDemoMode();
  const { theme } = useTheme();
  const { session, user: saasUser } = useSaaSProfile();
  const [appsOpen, setAppsOpen] = useState(false);
  const notifications = useBuildCoreNotificationsConfig(dash.getAccessToken);
  const themeLabel = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  const { launchApp, launchingAppId, launchError } = useZenformedAppLaunch({
    launchApiUrl: '/api/internal/app-launch',
    getAccessToken: () => session?.access_token ?? null,
  });

  const accountUser = useMemo(() => {
    if (dash.user == null) return null;
    return resolveAccountMenuUser(dash.user.email, saasUser?.user_metadata, {
      displayName: dash.user.displayName ?? null,
    });
  }, [dash.user, saasUser?.user_metadata]);

  const accountDisplayName = useZenformedShellUserDisplay({
    settingsApiUrl: nav.apis.usersMeSettings,
    getAccessToken: dash.getAccessToken,
    sessionUserId: dash.user?.id ?? null,
    user: accountUser,
    enabled: demoMode == null && accountUser != null,
  });

  const subscriptionActive = dash.entitlementSnapshot?.subscriptionActive ?? false;

  /** Stable element — avoids remounting the org workspace fetch on every sections rebuild. */
  const teamContent = useMemo(
    () => (
      <BuildCoreSidebarTeamSection
        getAccessToken={dash.getAccessToken}
        subscriptionActive={subscriptionActive}
      />
    ),
    [dash.getAccessToken, subscriptionActive]
  );

  const sections = useMemo(
    () =>
      buildBuildCoreSidebarSections({
        activeId: sidebarActiveId,
        onSelect: onSidebarSelect,
        canAccessTeams: dash.canAccessBuildCoreTeams,
        canAccessReports: dash.canAccessBuildCoreReports,
        canAccessWorkflowStages: dash.canAccessBuildCoreWorkflowStages,
        canViewTeamSection: dash.canAccessBuildCoreTeams || runtimeModes.isDemoRuntime(),
        teamContent,
      }),
    [
      dash.canAccessBuildCoreReports,
      dash.canAccessBuildCoreTeams,
      dash.canAccessBuildCoreWorkflowStages,
      onSidebarSelect,
      sidebarActiveId,
      teamContent,
    ]
  );

  const appIconSrc = buildCoreAppIconSrc();
  const appDisplayName = buildcoreAppDefinition.displayName;
  const appTierLabel = useMemo(() => {
    const snap = dash.entitlementSnapshot;
    if (!snap?.subscriptionActive || !snap.planSlugNormalized?.trim()) return null;
    return formatPlanDisplayName('buildcore', snap.planSlugNormalized);
  }, [dash.entitlementSnapshot]);

  const appTriggerBadges = useMemo(() => {
    const snap = dash.entitlementSnapshot;
    if (snap?.subscriptionActive && snap.planSlugNormalized?.trim()) {
      return resolveAppEntitlementBadges(
        'buildcore',
        snap.planSlugNormalized,
        snap.entitlementStatus?.trim() || 'active'
      );
    }
    if (appTierLabel) {
      return {
        planLabel: appTierLabel,
        planBadgeVariant: 'default' as const,
        statusLabel: 'Active',
        statusBadgeVariant: 'active' as const,
      };
    }
    return null;
  }, [appTierLabel, dash.entitlementSnapshot]);

  const launcherApps = useMemo((): readonly ZenformedAppRegistryEntry[] => {
    return BUILDCORE_ZENFORMED_APPS.map((app) => {
      if (app.id === 'buildcore') {
        const snap = dash.entitlementSnapshot;
        if (snap?.subscriptionActive && snap.planSlugNormalized?.trim()) {
          return {
            ...app,
            entitlementBadges: resolveAppEntitlementBadges(
              'buildcore',
              snap.planSlugNormalized,
              snap.entitlementStatus?.trim() || 'active'
            ),
          };
        }
        if (appTierLabel) {
          return {
            ...app,
            entitlementBadges: {
              planLabel: appTierLabel,
              planBadgeVariant: 'default',
              statusLabel: 'Active',
              statusBadgeVariant: 'active',
            },
          };
        }
        return app;
      }
      if (app.id === 'platform') {
        return {
          ...app,
          entitlementBadges: {
            planLabel: 'Account',
            planBadgeVariant: 'default',
            statusLabel: 'Active',
            statusBadgeVariant: 'active',
          },
        };
      }
      return app;
    });
  }, [appTierLabel, dash.entitlementSnapshot]);

  const appsTrigger = ({
    open,
    onClick,
    ariaLabel,
  }: {
    readonly open: boolean;
    readonly onClick: () => void;
    readonly ariaLabel: string;
  }) => (
    <button
      type="button"
      data-zenformed-sidebar-apps-trigger
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="menu"
      disabled={demoMode != null}
      title={appDisplayName}
    >
      <ZenformedSidebarAppsTriggerChrome
        open={open}
        appName={appDisplayName}
        appTier={appTierLabel}
        appBadges={appTriggerBadges}
        appIcon={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appIconSrc} alt="" width={32} height={32} />
        }
      />
    </button>
  );

  const appsSwitcher =
    demoMode != null ? (
      <DemoDisabledAppsLauncher
        classNames={appsLauncherClassNames}
        appsIcon={<AppsIcon />}
        renderTrigger={appsTrigger}
      />
    ) : (
      <ZenformedAppsLauncher
        apps={launcherApps}
        classNames={appsLauncherClassNames}
        labels={appsLauncherLabels}
        launchApp={launchApp}
        launchingAppId={launchingAppId}
        launchError={launchError}
        appsIcon={<AppsIcon />}
        showAccountSection={false}
        popoverLayout="sidebarList"
        currentAppId="buildcore"
        onOpenChange={setAppsOpen}
        renderTrigger={appsTrigger}
      />
    );

  if (dash.saasProfile == null && dash.authLoading) {
    return (
      <ZenformedDashboardPageLoading
        classNames={pageLoadingClassNames}
        message={content.loading.page}
      />
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

  const railDisplayName =
    accountDisplayName.trim() || accountUser?.email?.trim() || '';

  return (
    <ZenformedDashboardAppShell classNames={{ appLayout: shellStyles.appLayout }}>
      <ZenformedCollapsibleSidebarShell
        appName={appDisplayName}
        appIconSrc={appIconSrc}
        organizationName={dash.shopName || null}
        appsSwitcher={appsSwitcher}
        sections={sections}
        notifications={demoMode != null ? null : notifications}
        themeControl={<ThemeToggle />}
        themeLabel={themeLabel}
        otherSectionLabel="Other"
        otherSectionCollapsedLabel="OTHER"
        holdExpanded={appsOpen}
        settings={
          demoMode != null
            ? null
            : {
                label: 'Settings',
                icon: <SettingsIcon />,
                onSelect: () => dash.setSettingsOpen(true),
              }
        }
        account={
          demoMode != null || accountUser == null
            ? null
            : {
                user: accountUser,
                userDisplayName: railDisplayName,
                userEmail: accountUser.email,
                avatarUrl: null,
                avatarLoading: false,
                organizationRoleLabel: dash.organizationRoleLabel,
                labels: accountMenuLabels,
                classNames: headerShellClassNames,
                onOpenSettings: () => dash.setSettingsOpen(true),
                onRequestSignOutConfirm: () => dash.setSignOutModalOpen(true),
                onRequestProfilePhotoModal: () => dash.setProfilePhotoModalOpen(true),
                profilePhotoChangeEnabled: false,
                showSettingsButton: false,
                signOutIcon: <SignOutIcon className={headerShellClassNames.accountMenuBtnIcon} />,
                profilePhotoCameraIcon: <CameraIcon />,
              }
        }
      >
        <CorePlatformDegradedBanner variant="overlay" />
        <main className={shellStyles.mainContent}>
          {title != null ? <h1 className={shellStyles.headerTitle}>{title}</h1> : null}
          <CurrentUserAvatarProvider
            currentUserId={dash.user?.id ?? null}
            currentUserAvatarUrl={dash.avatarUrl}
          >
            <div className={shellStyles.listViewWrap}>{children}</div>
          </CurrentUserAvatarProvider>
        </main>
      </ZenformedCollapsibleSidebarShell>

      {demoMode == null ? (
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
      ) : null}

      {demoMode == null ? (
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
      ) : null}
    </ZenformedDashboardAppShell>
  );
}
