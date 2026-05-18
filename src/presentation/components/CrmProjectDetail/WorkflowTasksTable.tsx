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
import { WorkflowTasksListModal } from './WorkflowTasksListModal';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onAddTask: () => void;
  onTaskUpdated: () => Promise<void>;
  onUploadComingSoon: () => void;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksTable({
  project,
  isApiSource,
  onAddTask,
  onTaskUpdated,
  onUploadComingSoon,
  onTaskError,
  onRequestArchiveTask,
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
        <button
          type="button"
          className={styles.addTaskBtn}
          onClick={onAddTask}
          title={wf.addTask}
          aria-label={wf.addTask}
        >
          <span aria-hidden>+</span>
        </button>
      </div>
      {groups.length === 0 ? (
        <div className={styles.workflowPanelGrow}>
          <p className={styles.subtitle}>{wf.empty}</p>
        </div>
      ) : (
        <div className={`${styles.stageGroupStack} ${styles.workflowPanelGrow}`}>
          {previewGroups.map((group) => (
            <WorkflowStageTaskGroup
              key={group.collapseKey}
              projectSlug={project.summary.slug}
              group={group}
              isCurrentStage={
                !hasMoreTasks && !group.isPaymentsGroup && group.stageSlug === currentStage
              }
              docCounts={docCounts}
              isApiSource={isApiSource}
              onTaskUpdated={onTaskUpdated}
              onUploadComingSoon={onUploadComingSoon}
              onTaskError={onTaskError}
              onRequestArchiveTask={onRequestArchiveTask}
            />
          ))}
        </div>
      )}
      {hasMoreTasks ? (
        <button
          type="button"
          className={`${styles.panelFooterLink} ${styles.workflowPanelFooter}`}
          onClick={() => setAllTasksOpen(true)}
        >
          {wf.viewAll}
        </button>
      ) : null}
      <WorkflowTasksListModal
        open={allTasksOpen}
        project={project}
        isApiSource={isApiSource}
        onClose={() => setAllTasksOpen(false)}
        onTaskUpdated={onTaskUpdated}
        onUploadComingSoon={onUploadComingSoon}
        onTaskError={onTaskError}
        onRequestArchiveTask={onRequestArchiveTask}
      />
    </section>
  );
}
