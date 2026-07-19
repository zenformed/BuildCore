'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

export type MemberNoActiveTasksRowProps = {
  /** Grid class matching the section header/rows (workflow ops or payments). */
  readonly gridClassName: string;
  readonly variant?: 'table' | 'mobile';
  /**
   * When true (default), wrap in stage table chrome for a standalone active section.
   * When false, render only the row (already inside paymentsTableRows / stageGroupTable).
   */
  readonly wrapInSection?: boolean;
};

/** Bordered empty active-list row so layout stays aligned with task tables. */
export function MemberNoActiveTasksRow({
  gridClassName,
  variant = 'table',
  wrapInSection = true,
}: MemberNoActiveTasksRowProps): ReactElement {
  const message = content.crm.myTasks.detail.noActiveTasks;

  if (variant === 'mobile') {
    return <p className={styles.workflowStageMobileEmpty}>{message}</p>;
  }

  const row = (
    <div
      className={`${styles.tableRow} ${gridClassName} ${styles.workflowStageEmptyRow}`}
      role="row"
    >
      <span className={styles.workflowPrimaryCell}>
        <span className={styles.workflowStageEmptyMessage}>{message}</span>
      </span>
    </div>
  );

  if (!wrapInSection) return row;

  return (
    <div className={styles.stageGroup_unifiedTableSection}>
      <div className={styles.stageGroupTable}>{row}</div>
    </div>
  );
}
