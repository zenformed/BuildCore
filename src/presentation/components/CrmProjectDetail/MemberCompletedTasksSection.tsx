'use client';

import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

export type MemberCompletedTasksSectionProps = {
  readonly taskCount: number;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Member-only disclosure under Workflow / Payment task lists for status === done rows.
 */
export function MemberCompletedTasksSection({
  taskCount,
  children,
  className,
}: MemberCompletedTasksSectionProps): ReactElement | null {
  const copy = content.crm.myTasks.detail;
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);

  if (taskCount <= 0) return null;

  return (
    <div className={[styles.memberCompletedTasks, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.memberCompletedTasksToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={
          expanded
            ? `${copy.collapseCompletedTasks} (${taskCount})`
            : `${copy.expandCompletedTasks} (${taskCount})`
        }
        onClick={() => setExpanded((open) => !open)}
      >
        <span className={styles.memberCompletedTasksLabel}>
          {copy.completedTasks}
          <span className={styles.memberCompletedTasksCount}>{taskCount}</span>
        </span>
        <span className={styles.stageGroupChevronWrap} aria-hidden>
          <span
            className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron}
          />
        </span>
      </button>
      {expanded ? (
        <div id={panelId} className={styles.memberCompletedTasksPanel}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function isMemberCompletedWorkflowTask(status: string): boolean {
  return status === 'done';
}
