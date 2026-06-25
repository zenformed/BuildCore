'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { TeamsDesktopNavId } from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';
import { buildTeamsDesktopNav } from '@/presentation/features/buildCoreTeams/teamsFolderTabModel';
import styles from './BuildCoreTeams.module.css';

export type TeamsSidebarNavProps = {
  readonly selectedNav: TeamsDesktopNavId;
  readonly onSelectNav: (navId: TeamsDesktopNavId) => void;
};

export function TeamsSidebarNav({
  selectedNav,
  onSelectNav,
}: TeamsSidebarNavProps): ReactElement {
  const navItems = buildTeamsDesktopNav();
  const navCopy = content.teams.desktopNav;

  return (
    <nav className={styles.teamsSidebarNav} aria-label={navCopy.ariaLabel}>
      {navItems.map((item) => {
        const isActive = item.id === selectedNav;
        return (
          <button
            key={item.id}
            type="button"
            className={
              isActive
                ? `${styles.teamsSidebarNavItem} ${styles.teamsSidebarNavItem_active}`
                : styles.teamsSidebarNavItem
            }
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectNav(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
