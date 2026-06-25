'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import {
  pickHeaderShellClassNames,
  pickAppsLauncherClassNames,
  pickAppIconNavMenuClassNames,
  pickSidebarBrandingClassNames,
  ZenformedAppsLauncher,
  ZenformedAppIconNavMenu,
  ZenformedDashboardHeader,
  useZenformedAppLaunch,
  useZenformedMobileShellLayout,
  resolveAccountMenuUser,
  type ZenformedAccountMenuLabels,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { BUILDCORE_ZENFORMED_APPS } from '@/platform/appDefinitions/zenformedApps';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreAppIconSrc } from '@/platform/assets/buildCoreAppIcon';
import {
  AppsIcon,
  CameraIcon,
  SettingsIcon,
  SignOutIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import {
  DemoDecorativeAccountAvatar,
  DemoDisabledAppsLauncher,
} from '@/presentation/components/Demo/DemoDisabledShellControls';
import {
  buildBuildCoreAppIconNavMenuItems,
  type BuildCoreSidebarNavAccess,
} from './buildCoreSidebarNavModel';
import type { BuildCoreSidebarNavId } from './BuildCoreSidebar';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import appsStyles from './buildCorePlatformApps.module.css';

const headerShellClassNames = pickHeaderShellClassNames(styles);
const appsLauncherClassNames = pickAppsLauncherClassNames(appsStyles);
const appIconNavMenuClassNames = pickAppIconNavMenuClassNames(styles);
const sidebarBrandingClassNames = pickSidebarBrandingClassNames(styles);

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

export type BuildCoreDashboardHeaderProps = {
  user: { email: string; displayName?: string | null } | null;
  effectiveLicenseTier: string | null | undefined;
  organizationRoleLabel?: string | null;
  avatarUrl: string | null | undefined;
  avatarLoading: boolean;
  getAccessToken: () => string | null;
  onOpenSettings: () => void;
  onRequestSignOutConfirm: () => void;
  onRequestProfilePhotoModal: () => void;
  sidebarActiveId: BuildCoreSidebarNavId;
  onSidebarSelect: (id: BuildCoreSidebarNavId) => void;
  sidebarNavAccess: BuildCoreSidebarNavAccess;
};

export function BuildCoreDashboardHeader({
  user,
  effectiveLicenseTier,
  organizationRoleLabel,
  avatarUrl,
  avatarLoading,
  getAccessToken,
  onOpenSettings,
  onRequestSignOutConfirm,
  onRequestProfilePhotoModal,
  sidebarActiveId,
  onSidebarSelect,
  sidebarNavAccess,
}: BuildCoreDashboardHeaderProps): ReactElement {
  const isDemoRuntime = runtimeModes.isDemoRuntime();
  const { session, user: saasUser } = useSaaSProfile();
  const accountUser = useMemo(() => {
    if (user == null) return null;
    return resolveAccountMenuUser(user.email, saasUser?.user_metadata, {
      displayName: user.displayName ?? null,
    });
  }, [saasUser?.user_metadata, user]);
  const isMobileShell = useZenformedMobileShellLayout();
  const { launchApp, launchingAppId, launchError } = useZenformedAppLaunch({
    launchApiUrl: '/api/internal/app-launch',
    getAccessToken: () => session?.access_token ?? null,
  });

  const appIconNavMenu = isMobileShell ? (
    <ZenformedAppIconNavMenu
      brandingClassNames={sidebarBrandingClassNames}
      menuClassNames={appIconNavMenuClassNames}
      appName={buildcoreAppDefinition.displayName}
      appIconSrc={buildCoreAppIconSrc()}
      appAltText={buildcoreAppDefinition.displayName}
      menuAriaLabel={nav.sidebar.ariaLabel}
      triggerAriaLabel={`${buildcoreAppDefinition.displayName} navigation`}
      items={buildBuildCoreAppIconNavMenuItems(
        sidebarActiveId,
        onSidebarSelect,
        sidebarNavAccess
      )}
    />
  ) : null;

  if (isDemoRuntime) {
    return (
      <header className={headerShellClassNames.header} data-zenformed-dashboard-header>
        <div
          className={headerShellClassNames.headerLeft}
          data-zenformed-header-left
          aria-hidden={appIconNavMenu == null ? true : undefined}
        >
          {appIconNavMenu}
        </div>
        {accountUser ? (
          <div className={headerShellClassNames.headerRight} data-zenformed-header-right>
            <>
              <ThemeToggle />
              <DemoDisabledAppsLauncher
                classNames={appsLauncherClassNames}
                appsIcon={<AppsIcon />}
              />
            </>
            <DemoDecorativeAccountAvatar
              classNames={headerShellClassNames}
              user={accountUser}
            />
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <ZenformedDashboardHeader
      classNames={headerShellClassNames}
      user={accountUser}
      avatarUrl={avatarUrl}
      avatarLoading={avatarLoading}
      effectiveLicenseTier={effectiveLicenseTier}
      organizationRoleLabel={organizationRoleLabel}
      labels={accountMenuLabels}
      settingsApiUrl={nav.apis.usersMeSettings}
      getAccessToken={getAccessToken}
      sessionUserId={session?.user?.id ?? null}
      leftSlot={appIconNavMenu}
      themeToggle={
        <>
          <ThemeToggle />
          <ZenformedAppsLauncher
            apps={BUILDCORE_ZENFORMED_APPS}
            classNames={appsLauncherClassNames}
            labels={appsLauncherLabels}
            launchApp={launchApp}
            launchingAppId={launchingAppId}
            launchError={launchError}
            appsIcon={<AppsIcon />}
          />
        </>
      }
      onOpenSettings={onOpenSettings}
      onRequestSignOutConfirm={onRequestSignOutConfirm}
      onRequestProfilePhotoModal={onRequestProfilePhotoModal}
      profilePhotoChangeEnabled={false}
      settingsIcon={<SettingsIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      signOutIcon={<SignOutIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      profilePhotoCameraIcon={<CameraIcon />}
    />
  );
}
