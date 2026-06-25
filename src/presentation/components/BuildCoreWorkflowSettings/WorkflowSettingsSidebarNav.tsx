'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { WorkflowSettingsDesktopNavId } from '@/presentation/features/buildCoreWorkflowSettings/workflowSettingsNavModel';
import { buildWorkflowSettingsDesktopNav } from '@/presentation/features/buildCoreWorkflowSettings/workflowSettingsNavModel';
import styles from './BuildCoreWorkflowSettings.module.css';

export type WorkflowSettingsSidebarNavProps = {
  readonly selectedNav: WorkflowSettingsDesktopNavId;
  readonly onSelectNav: (navId: WorkflowSettingsDesktopNavId) => void;
};

export function WorkflowSettingsSidebarNav({
  selectedNav,
  onSelectNav,
}: WorkflowSettingsSidebarNavProps): ReactElement {
  const navItems = buildWorkflowSettingsDesktopNav();
  const navCopy = content.workflowSettings.desktopNav;

  return (
    <nav className={styles.workflowSettingsSidebarNav} aria-label={navCopy.ariaLabel}>
      {navItems.map((item) => {
        const isActive = item.id === selectedNav;
        return (
          <button
            key={item.id}
            type="button"
            className={
              isActive
                ? `${styles.workflowSettingsSidebarNavItem} ${styles.workflowSettingsSidebarNavItem_active}`
                : styles.workflowSettingsSidebarNavItem
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
