'use client';

import type { ReactElement } from 'react';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import {
  pickHeaderShellClassNames,
  pickAppsLauncherClassNames,
  ZenformedAppsLauncher,
  ZenformedDashboardHeader,
  useZenformedAppLaunch,
  type ZenformedAccountMenuLabels,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { BUILDCORE_ZENFORMED_APPS } from '@/platform/appDefinitions/zenformedApps';
import {
  AppsIcon,
  CameraIcon,
  SettingsIcon,
  SignOutIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import appsStyles from './buildCorePlatformApps.module.css';

const headerShellClassNames = pickHeaderShellClassNames(styles);
const appsLauncherClassNames = pickAppsLauncherClassNames(appsStyles);

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
  sectionTitle: 'Apps',
  comingSoonLabel: 'Coming soon',
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
}: BuildCoreDashboardHeaderProps): ReactElement {
  const { session } = useSaaSProfile();
  const { launchApp, launchingAppId, launchError } = useZenformedAppLaunch({
    launchApiUrl: '/api/internal/app-launch',
    getAccessToken: () => session?.access_token ?? null,
  });

  return (
    <ZenformedDashboardHeader
      classNames={headerShellClassNames}
      user={user}
      avatarUrl={avatarUrl}
      avatarLoading={avatarLoading}
      effectiveLicenseTier={effectiveLicenseTier}
      organizationRoleLabel={organizationRoleLabel}
      labels={accountMenuLabels}
      settingsApiUrl={nav.apis.usersMeSettings}
      getAccessToken={getAccessToken}
      sessionUserId={session?.user?.id ?? null}
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
      settingsIcon={<SettingsIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      signOutIcon={<SignOutIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      profilePhotoCameraIcon={<CameraIcon />}
    />
  );
}
