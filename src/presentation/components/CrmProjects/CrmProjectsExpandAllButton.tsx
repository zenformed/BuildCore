'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CaretDownIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './CrmProjects.module.css';

export type CrmProjectsExpandAllButtonProps = {
  readonly allExpanded: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
};

/** Solid triangle caret — down to expand all, up to collapse all. */
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
      className={styles.projectsExpandAllCaretBtn}
      title={label}
      aria-label={label}
      aria-expanded={allExpanded}
      disabled={disabled}
      onClick={onToggle}
    >
      <CaretDownIcon
        className={
          allExpanded
            ? `${styles.projectsExpandAllCaretIcon} ${styles.projectsExpandAllCaretIcon_up}`
            : styles.projectsExpandAllCaretIcon
        }
      />
    </button>
  );
}
