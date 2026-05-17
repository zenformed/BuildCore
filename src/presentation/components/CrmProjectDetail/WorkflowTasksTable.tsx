'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask, WorkflowTaskStatus } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { sortWorkflowTasksForDisplay } from '@/presentation/features/crmProjectDetail/workflowTaskSort';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowTasksTableProps = {
  project: CrmProjectDetail;
  onAddTask: () => void;
  onEditTask: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksTable({
  project,
  onAddTask,
  onEditTask,
}: WorkflowTasksTableProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const wf = content.projectDetail.workflow;
  const currentStage = project.summary.currentStageSlug;
  const tasks = sortWorkflowTasksForDisplay(project.workflowTasks, currentStage);
  const docCounts = countDocumentsByTaskId(project.documents);

  return (
    <section className={styles.card} aria-labelledby="workflow-tasks-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="workflow-tasks-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.workflow}
        </h3>
        <button type="button" className={styles.editBtn} onClick={onAddTask}>
          {wf.addTask}
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className={styles.subtitle}>{wf.empty}</p>
      ) : (
        <div className={styles.scrollContainer}>
          <div className={`${styles.tableHeader} ${styles.workflowGrid}`} role="row">
            <span role="columnheader">{cols.task}</span>
            <span role="columnheader">{cols.stage}</span>
            <span role="columnheader">{cols.status}</span>
            <span role="columnheader">{cols.documents}</span>
            <span role="columnheader">{cols.due}</span>
            <span role="columnheader">{cols.actions}</span>
          </div>
          {tasks.map((task) => {
            const isCurrentStage = task.stageSlug === currentStage;
            const rowClass = isCurrentStage
              ? `${styles.tableRow} ${styles.workflowGrid} ${styles.tableRow_current}`
              : `${styles.tableRow} ${styles.workflowGrid}`;
            const docCount = docCounts.get(task.id) ?? 0;
            return (
              <div key={task.id} className={rowClass} role="row">
                <span>{task.title}</span>
                <span>{formatStageLabel(task.stageSlug)}</span>
                <span>
                  <span className={`${shared.statusBadge} ${statusBadgeClass(task.status)}`}>
                    {formatWorkflowStatus(task.status)}
                  </span>
                </span>
                <span className={styles.documentsCell} title={wf.documentsCountSuffix}>
                  {docCount === 0 ? wf.documentsNone : `${docCount} ${wf.documentsCountSuffix}`}
                </span>
                <span>{formatShortDate(task.dueAt)}</span>
                <span>
                  <button type="button" className={styles.rowActionBtn} onClick={() => onEditTask(task)}>
                    {wf.editTask}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
