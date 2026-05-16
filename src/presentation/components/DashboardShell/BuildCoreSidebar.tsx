'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { HomeIcon, GridIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './BuildCoreSidebar.module.css';

export type BuildCoreSidebarNavId = 'home' | 'overview';

export type BuildCoreSidebarProps = {
  activeId: BuildCoreSidebarNavId;
  onSelect: (id: BuildCoreSidebarNavId) => void;
  children?: React.ReactNode;
};

export function BuildCoreSidebar({ activeId, onSelect, children }: BuildCoreSidebarProps): ReactElement {
  const { ariaLabel, items } = nav.sidebar;
  return (
    <nav className={styles.sidebar} aria-label={ariaLabel}>
      {children ? <div className={styles.sidebarLogoSlot}>{children}</div> : null}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.btn} ${activeId === item.id ? styles.btnActive : ''}`}
          onClick={() => onSelect(item.id)}
          aria-pressed={activeId === item.id}
          aria-label={item.label}
          title={item.title}
        >
          {item.id === 'home' ? <HomeIcon /> : <GridIcon />}
        </button>
      ))}
    </nav>
  );
}
