'use client';

import type { ReactElement } from 'react';
import { ThemeToggle } from '@/presentation/components/ThemeToggle';
import {
  pickHeaderShellClassNames,
  ZenformedDashboardHeader,
  type ZenformedAccountMenuLabels,
} from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CameraIcon, SearchIcon, SettingsIcon, SignOutIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';

const headerShellClassNames = pickHeaderShellClassNames(styles);

const accountMenuLabels: ZenformedAccountMenuLabels = {
  menuTriggerAriaLabel: nav.header.account.menuTriggerAriaLabel,
  planAriaLabelPrefix: nav.header.account.planAriaLabelPrefix,
  adminBadgeLabel: nav.header.account.adminBadgeLabel,
  profilePhotoChangeTitle: nav.header.account.profilePhotoChange.title,
  profilePhotoChangeAriaLabel: nav.header.account.profilePhotoChange.ariaLabel,
  settingsButtonLabel: nav.header.account.settingsButton.label,
  signOutButtonLabel: nav.header.account.signOutButton.label,
};

export type BuildCoreDashboardHeaderProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showProjectActions: boolean;
  onNewProjectClick: () => void;
  newProjectDisabled?: boolean;
  user: { email: string } | null;
  effectiveLicenseTier: string | null | undefined;
  isAdmin: boolean;
  avatarUrl: string | null | undefined;
  avatarLoading: boolean;
  shopName: string | null | undefined;
  onOpenSettings: () => void;
  onRequestSignOutConfirm: () => void;
  onRequestProfilePhotoModal: () => void;
};

export function BuildCoreDashboardHeader({
  searchQuery,
  onSearchQueryChange,
  showProjectActions,
  onNewProjectClick,
  newProjectDisabled = false,
  user,
  effectiveLicenseTier,
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
      isAdmin={isAdmin}
      labels={accountMenuLabels}
      themeToggle={<ThemeToggle />}
      onOpenSettings={onOpenSettings}
      onRequestSignOutConfirm={onRequestSignOutConfirm}
      onRequestProfilePhotoModal={onRequestProfilePhotoModal}
      centerSlot={
        showProjectActions ? (
          <div className={styles.headerSearchWrap}>
            <SearchIcon className={styles.headerSearchIcon} />
            <input
              type="search"
              placeholder={nav.header.search.placeholder}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className={styles.headerSearch}
              aria-label={nav.header.search.ariaLabel}
            />
            <button
              type="button"
              className={styles.headerNewOrderBtn}
              disabled={newProjectDisabled}
              onClick={onNewProjectClick}
              title={nav.header.newProject.title}
              aria-label={nav.header.newProject.ariaLabel}
            >
              +
            </button>
          </div>
        ) : undefined
      }
      settingsIcon={<SettingsIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      signOutIcon={<SignOutIcon className={headerShellClassNames.accountMenuBtnIcon} />}
      profilePhotoCameraIcon={<CameraIcon />}
    />
  );
}
