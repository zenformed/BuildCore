'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import {
  countWorkflowTasksInGroups,
  groupOpsWorkflowTasksByStage,
  limitWorkflowTaskGroups,
  WORKFLOW_TASKS_PREVIEW_LIMIT,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableLayout = 'preview' | 'full';

export type WorkflowTasksTableProps = {
  layout?: WorkflowTasksTableLayout;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onAddTask: () => void;
  onTaskUpdated: () => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksTable({
  layout = 'preview',
  project,
  isApiSource,
  onAddTask,
  onTaskUpdated,
  onTaskError,
  onRequestArchiveTask,
}: WorkflowTasksTableProps): ReactElement {
  const router = useRouter();
  const wf = content.projectDetail.workflow;
  const isFullLayout = layout === 'full';
  const currentStage = project.summary.currentStageSlug;
  const groups = groupOpsWorkflowTasksByStage(project.workflowTasks, currentStage);
  const totalTasks = countWorkflowTasksInGroups(groups);
  const shouldLimitPreview = !isFullLayout && totalTasks > WORKFLOW_TASKS_PREVIEW_LIMIT;
  const showViewAllLink = !isFullLayout && groups.length > 0;
  const displayGroups = shouldLimitPreview
    ? limitWorkflowTaskGroups(groups, WORKFLOW_TASKS_PREVIEW_LIMIT)
    : groups;
  const docCounts = countDocumentsByTaskId(project.documents);

  const panelClass = [styles.workflowPanel, isFullLayout ? styles.workflowPanelFull : '']
    .filter(Boolean)
    .join(' ');

  const stackClass = [
    styles.stageGroupStack,
    isFullLayout ? styles.stageGroupStackFull : styles.workflowPanelGrow,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass} aria-labelledby="workflow-tasks-heading">
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
        <div className={isFullLayout ? undefined : styles.workflowPanelGrow}>
          <p className={styles.subtitle}>{wf.empty}</p>
        </div>
      ) : (
        <div className={stackClass}>
          {displayGroups.map((group) => (
            <WorkflowStageTaskGroup
              key={group.collapseKey}
              projectSlug={project.summary.slug}
              projectDocuments={project.documents}
              group={group}
              docCounts={docCounts}
              isApiSource={isApiSource}
              onTaskUpdated={onTaskUpdated}
              onTaskError={onTaskError}
              onRequestArchiveTask={onRequestArchiveTask}
            />
          ))}
        </div>
      )}
      {showViewAllLink ? (
        <div className={styles.workflowPanelFooters}>
          <button
            type="button"
            className={styles.panelFooterLink}
            onClick={() => router.push(nav.routes.projectWorkflowTasks(project.summary.slug))}
          >
            {wf.viewAll}
          </button>
        </div>
      ) : null}
    </section>
  );
}
