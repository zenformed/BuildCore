'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  ListIcon,
  ReportsIcon,
  TeamsIcon,
  WorkflowStagesIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './BuildCoreSidebar.module.css';

export type BuildCoreSidebarNavId = 'projects' | 'reports' | 'teams' | 'workflowStages';

const SIDEBAR_ICONS: Record<BuildCoreSidebarNavId, () => ReactElement> = {
  projects: ListIcon,
  reports: ReportsIcon,
  teams: TeamsIcon,
  workflowStages: WorkflowStagesIcon,
};

export type BuildCoreSidebarProps = {
  activeId: BuildCoreSidebarNavId;
  onSelect: (id: BuildCoreSidebarNavId) => void;
  /** When false, the Teams nav control is omitted (org members). */
  canAccessTeams?: boolean;
  /** When false, the Reports nav control is omitted (org members). */
  canAccessReports?: boolean;
  /** When false, the Workflow Stages nav control is omitted. */
  canAccessWorkflowStages?: boolean;
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
  const { ariaLabel, items } = nav.sidebar;
  const visibleItems = items.filter((item) => {
    if (item.id === 'teams' && !canAccessTeams) return false;
    if (item.id === 'reports' && !canAccessReports) return false;
    if (item.id === 'workflowStages' && !canAccessWorkflowStages) return false;
    return true;
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
