'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { groupWorkflowTasksByStage } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksListDrawerProps = {
  open: boolean;
  project: CrmProjectDetail;
  onClose: () => void;
  onEditTask: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksListDrawer({
  open,
  project,
  onClose,
  onEditTask,
}: WorkflowTasksListDrawerProps): ReactElement | null {
  const wf = content.projectDetail.workflow;

  if (!open) return null;

  const currentStage = project.summary.currentStageSlug;
  const groups = groupWorkflowTasksByStage(project.workflowTasks, currentStage);
  const docCounts = countDocumentsByTaskId(project.documents);

  return (
    <div className={shellStyles.settingsOverlay} onClick={onClose} role="presentation">
      <div
        className={shellStyles.settingsDrawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-all-tasks-title"
      >
        <div className={shellStyles.settingsHeader}>
          <h2 id="workflow-all-tasks-title" className={shellStyles.settingsTitle}>
            {wf.allTasksTitle}
          </h2>
          <button type="button" className={shellStyles.settingsClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={`${shellStyles.settingsContent} ${styles.workflowAllDrawerBody}`}>
          {groups.length === 0 ? (
            <p className={styles.subtitle}>{wf.empty}</p>
          ) : (
            <div className={`${styles.stageGroupStack} ${styles.stageGroupStack_scroll}`}>
              {groups.map((group) => (
                <WorkflowStageTaskGroup
                  key={group.stageSlug}
                  group={group}
                  isCurrentStage={group.stageSlug === currentStage}
                  docCounts={docCounts}
                  onEditTask={(task) => {
                    onClose();
                    onEditTask(task);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
