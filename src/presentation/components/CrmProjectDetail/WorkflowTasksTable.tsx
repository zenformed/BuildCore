'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import {
  countWorkflowTasksInGroups,
  groupWorkflowTasksByStage,
  limitWorkflowTaskGroups,
  WORKFLOW_TASKS_PREVIEW_LIMIT,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import { WorkflowTasksListDrawer } from './WorkflowTasksListDrawer';
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
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const currentStage = project.summary.currentStageSlug;
  const groups = groupWorkflowTasksByStage(project.workflowTasks, currentStage);
  const totalTasks = countWorkflowTasksInGroups(groups);
  const hasMoreTasks = totalTasks > WORKFLOW_TASKS_PREVIEW_LIMIT;
  const previewGroups = hasMoreTasks
    ? limitWorkflowTaskGroups(groups, WORKFLOW_TASKS_PREVIEW_LIMIT)
    : groups;
  const docCounts = countDocumentsByTaskId(project.documents);

  return (
    <section className={styles.workflowPanel} aria-labelledby="workflow-tasks-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="workflow-tasks-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.workflow}
        </h3>
        <button type="button" className={`${styles.editBtn} ${styles.primaryBtn}`} onClick={onAddTask}>
          {wf.addTask}
        </button>
      </div>
      {groups.length === 0 ? (
        <p className={styles.subtitle}>{wf.empty}</p>
      ) : (
        <div className={styles.stageGroupStack}>
          {previewGroups.map((group) => (
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
      {hasMoreTasks ? (
        <button
          type="button"
          className={styles.panelFooterLink}
          onClick={() => setAllTasksOpen(true)}
        >
          {wf.viewAll}
        </button>
      ) : null}
      <WorkflowTasksListDrawer
        open={allTasksOpen}
        project={project}
        onClose={() => setAllTasksOpen(false)}
        onEditTask={onEditTask}
      />
    </section>
  );
}
