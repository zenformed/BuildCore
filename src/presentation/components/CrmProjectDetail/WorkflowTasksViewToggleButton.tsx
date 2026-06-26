'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { GridIcon, ListIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from '@/presentation/components/CrmProjects/CrmProjects.module.css';

export type WorkflowTaskViewMode = 'table' | 'cards';

export type WorkflowTasksViewToggleButtonProps = {
  readonly viewMode: WorkflowTaskViewMode;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
};

export function WorkflowTasksViewToggleButton({
  viewMode,
  disabled = false,
  onToggle,
}: WorkflowTasksViewToggleButtonProps): ReactElement {
  const copy = content.projectDetail.workflow.viewMode;
  const switchToCards = viewMode === 'table';
  const label = switchToCards ? copy.switchToCards : copy.switchToTable;

  return (
    <button
      type="button"
      className={`${styles.projectsFilterBtn}${
        viewMode === 'cards' ? ` ${styles.projectsFilterBtn_active}` : ''
      }`}
      title={label}
      aria-label={label}
      aria-pressed={viewMode === 'cards'}
      disabled={disabled}
      onClick={onToggle}
    >
      {switchToCards ? (
        <GridIcon className={styles.projectsFilterBtnIcon} />
      ) : (
        <ListIcon className={styles.projectsFilterBtnIcon} />
      )}
    </button>
  );
}
