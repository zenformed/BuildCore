'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { groupWorkflowTasksByStage } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksListModalProps = {
  open: boolean;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onClose: () => void;
  onTaskUpdated: () => Promise<void>;
  onUploadComingSoon: () => void;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksListModal({
  open,
  project,
  isApiSource,
  onClose,
  onTaskUpdated,
  onUploadComingSoon,
  onTaskError,
  onRequestArchiveTask,
}: WorkflowTasksListModalProps): ReactElement | null {
  const wf = content.projectDetail.workflow;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const currentStage = project.summary.currentStageSlug;
  const groups = groupWorkflowTasksByStage(project.workflowTasks, currentStage);
  const docCounts = countDocumentsByTaskId(project.documents);

  return (
    <div className={styles.detailListModalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.detailListModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-all-tasks-title"
      >
        <div className={styles.detailListModalHeader}>
          <h2 id="workflow-all-tasks-title" className={styles.detailListModalTitle}>
            {wf.allTasksTitle}
          </h2>
          <button type="button" className={styles.detailListModalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.detailListModalBody}>
          {groups.length === 0 ? (
            <p className={styles.subtitle}>{wf.empty}</p>
          ) : (
            <div className={styles.stageGroupStack}>
              {groups.map((group) => (
                <WorkflowStageTaskGroup
                  key={group.collapseKey}
                  projectSlug={project.summary.slug}
                  group={group}
                  isCurrentStage={!group.isPaymentsGroup && group.stageSlug === currentStage}
                  docCounts={docCounts}
                  isApiSource={isApiSource}
                  collapsible={false}
                  onTaskUpdated={onTaskUpdated}
                  onUploadComingSoon={onUploadComingSoon}
                  onTaskError={onTaskError}
                  onRequestArchiveTask={onRequestArchiveTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
