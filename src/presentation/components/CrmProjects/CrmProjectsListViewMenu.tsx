'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ListViewSwitchIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import type { DashboardListViewMode } from '@/presentation/features/crmProjects/dashboardListViewMode';
import styles from './CrmProjects.module.css';

export type CrmProjectsListViewMenuProps = {
  readonly viewMode: DashboardListViewMode;
  readonly onChange: (viewMode: DashboardListViewMode) => void;
};

/** Icon toggle swapping between projects and subprojects list views. */
export function CrmProjectsListViewMenu({
  viewMode,
  onChange,
}: CrmProjectsListViewMenuProps): ReactElement {
  const copy = content.crm.panel.listView;
  const isSubprojectsView = viewMode === 'subprojects';
  const nextMode: DashboardListViewMode = isSubprojectsView ? 'projects' : 'subprojects';
  const label = isSubprojectsView ? copy.showProjects : copy.showSubprojects;

  return (
    <button
      type="button"
      className={
        isSubprojectsView
          ? `${styles.projectsFilterBtn} ${styles.projectsFilterBtn_active}`
          : styles.projectsFilterBtn
      }
      aria-pressed={isSubprojectsView}
      aria-label={label}
      title={label}
      onClick={() => onChange(nextMode)}
    >
      <ListViewSwitchIcon className={styles.projectsFilterBtnIcon} />
    </button>
  );
}
