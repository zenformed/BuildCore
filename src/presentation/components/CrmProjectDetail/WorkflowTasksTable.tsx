'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail, WorkflowTaskStatus } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

function statusClass(status: WorkflowTaskStatus): string {
  return styles[`status_${status}`] ?? styles.status_pending;
}

export type WorkflowTasksTableProps = {
  project: CrmProjectDetail;
};

export function WorkflowTasksTable({ project }: WorkflowTasksTableProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const tasks = [...project.workflowTasks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className={styles.card} aria-labelledby="workflow-tasks-heading">
      <h3 id="workflow-tasks-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.workflow}
      </h3>
      {tasks.length === 0 ? (
        <p className={styles.subtitle}>{content.projectDetail.workflow.empty}</p>
      ) : (
        <div className={styles.scrollContainer}>
          <div className={`${styles.tableHeader} ${styles.workflowGrid}`} role="row">
            <span role="columnheader">{cols.task}</span>
            <span role="columnheader">{cols.stage}</span>
            <span role="columnheader">{cols.status}</span>
            <span role="columnheader">{cols.assignee}</span>
            <span role="columnheader">{cols.due}</span>
          </div>
          {tasks.map((task) => (
            <div key={task.id} className={`${styles.tableRow} ${styles.workflowGrid}`} role="row">
              <span>{task.title}</span>
              <span>{formatStageLabel(task.stageSlug)}</span>
              <span className={statusClass(task.status)}>{formatWorkflowStatus(task.status)}</span>
              <span>
                {task.assignedTo ? (
                  <TeamMemberAvatar member={task.assignedTo} />
                ) : (
                  content.projectDetail.unassigned
                )}
              </span>
              <span>{formatShortDate(task.dueAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
