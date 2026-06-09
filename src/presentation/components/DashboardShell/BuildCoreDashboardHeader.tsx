'use client';

import type { ReactElement } from 'react';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import {
  formatOrganizationRoleLabel,
  pickHeaderShellClassNames,
  ZenformedDashboardHeader,
  type ZenformedAccountMenuLabels,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CameraIcon, SettingsIcon, SignOutIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

const headerShellClassNames = pickHeaderShellClassNames(styles);

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

export type BuildCoreDashboardHeaderProps = {
  user: { email: string } | null;
  effectiveLicenseTier: string | null | undefined;
  organizationRoleLabel?: string | null;
  isAdmin: boolean;
  avatarUrl: string | null | undefined;
  avatarLoading: boolean;
  shopName: string | null | undefined;
  onOpenSettings: () => void;
  onRequestSignOutConfirm: () => void;
  onRequestProfilePhotoModal: () => void;
};

export function BuildCoreDashboardHeader({
  user,
  effectiveLicenseTier,
  organizationRoleLabel,
  isAdmin,
  avatarUrl,
  avatarLoading,
  shopName,
  onOpenSettings,
  onRequestSignOutConfirm,
  onRequestProfilePhotoModal,
}: BuildCoreDashboardHeaderProps): ReactElement {
  return (
    <ZenformedDashboardHeader
      classNames={headerShellClassNames}
      user={user}
      avatarUrl={avatarUrl}
      avatarLoading={avatarLoading}
      shopName={shopName}
      defaultShopNameFallback={content.branding.defaultShopNameFallback}
      effectiveLicenseTier={effectiveLicenseTier}
      organizationRoleLabel={organizationRoleLabel}
      isAdmin={isAdmin}
      labels={accountMenuLabels}
      themeToggle={<ThemeToggle />}
      onOpenSettings={onOpenSettings}
      onRequestSignOutConfirm={onRequestSignOutConfirm}
      onRequestProfilePhotoModal={onRequestProfilePhotoModal}
      settingsIcon={<SettingsIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      signOutIcon={<SignOutIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      profilePhotoCameraIcon={<CameraIcon />}
    />
  );
}
