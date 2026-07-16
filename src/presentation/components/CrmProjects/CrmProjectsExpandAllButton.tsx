'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './CrmProjects.module.css';

export type CrmProjectsExpandAllButtonProps = {
  readonly allExpanded: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
};

/** Chevron arrow — down to expand all, up to collapse all (matches project Subprojects toggle). */
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
      <span className={styles.projectsExpandAllChevronWrap} aria-hidden>
        <span
          className={
            allExpanded
              ? styles.projectsExpandAllChevron_expanded
              : styles.projectsExpandAllChevron
          }
        />
      </span>
    </button>
  );
}
