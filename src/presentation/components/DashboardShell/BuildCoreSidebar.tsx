'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  filterBuildCoreSidebarNavItems,
  type BuildCoreSidebarNavAccess,
} from './buildCoreSidebarNavModel';
import {
  ListIcon,
  ImageIcon,
  MapIcon,
  ReportsIcon,
  TeamsIcon,
  WorkflowStagesIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './BuildCoreSidebar.module.css';

export type BuildCoreSidebarNavId =
  | 'projects'
  | 'reports'
  | 'photos'
  | 'map'
  | 'teams'
  | 'workflowStages'
  | 'notifications';

const SIDEBAR_ICONS: Record<BuildCoreSidebarNavId, () => ReactElement> = {
  projects: ListIcon,
  reports: ReportsIcon,
  photos: ImageIcon,
  map: MapIcon,
  teams: TeamsIcon,
  workflowStages: WorkflowStagesIcon,
  notifications: ListIcon,
};

export type BuildCoreSidebarProps = BuildCoreSidebarNavAccess & {
  activeId: BuildCoreSidebarNavId;
  onSelect: (id: BuildCoreSidebarNavId) => void;
  children?: React.ReactNode;
};

export function BuildCoreSidebar({
  activeId,
  onSelect,
  canAccessTeams = true,
  canAccessReports = true,
  canAccessWorkflowStages = true,
  children,
}: BuildCoreSidebarProps): ReactElement {
  const { ariaLabel } = nav.sidebar;
  const visibleItems = filterBuildCoreSidebarNavItems({
    canAccessTeams,
    canAccessReports,
    canAccessWorkflowStages,
  });
  return (
    <nav className={styles.sidebar} aria-label={ariaLabel}>
      {children ? <div className={styles.sidebarLogoSlot}>{children}</div> : null}
      {visibleItems.map((item) => {
        const Icon = SIDEBAR_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.btn} ${activeId === item.id ? styles.btnActive : ''}`}
            onClick={() => onSelect(item.id)}
            aria-pressed={activeId === item.id}
            aria-label={item.label}
            title={item.title}
          >
            <Icon />
          </button>
        );
      })}
    </nav>
  );
}
