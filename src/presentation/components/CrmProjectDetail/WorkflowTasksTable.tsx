'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { groupWorkflowTasksByStage } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import styles from './ProjectDetail.module.css';

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
  const wf = content.projectDetail.workflow;
  const currentStage = project.summary.currentStageSlug;
  const groups = groupWorkflowTasksByStage(project.workflowTasks, currentStage);
  const docCounts = countDocumentsByTaskId(project.documents);

  return (
    <section className={styles.workflowPanel} aria-labelledby="workflow-tasks-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="workflow-tasks-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.workflow}
        </h3>
        <button type="button" className={styles.editBtn} onClick={onAddTask}>
          {wf.addTask}
        </button>
      </div>
      {groups.length === 0 ? (
        <p className={styles.subtitle}>{wf.empty}</p>
      ) : (
        <div className={styles.stageGroupStack}>
          {groups.map((group) => (
            <WorkflowStageTaskGroup
              key={group.stageSlug}
              group={group}
              isCurrentStage={group.stageSlug === currentStage}
              docCounts={docCounts}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}
