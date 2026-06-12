'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  CollapseAllIcon,
  ExpandAllIcon,
} from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './CrmProjects.module.css';

export type CrmProjectsExpandAllButtonProps = {
  readonly allExpanded: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
};

export function CrmProjectsExpandAllButton({
  allExpanded,
  disabled = false,
  onToggle,
}: CrmProjectsExpandAllButtonProps): ReactElement {
  const copy = content.crm.panel;
  const label = allExpanded ? copy.collapseAllSubprojects : copy.expandAllSubprojects;

  return (
    <button
      type="button"
      className={styles.projectsFilterBtn}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
    >
      {allExpanded ? (
        <CollapseAllIcon className={styles.projectsFilterBtnIcon} />
      ) : (
        <ExpandAllIcon className={styles.projectsFilterBtnIcon} />
      )}
    </button>
  );
}
