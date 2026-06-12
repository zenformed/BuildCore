'use client';

import type { ReactElement } from 'react';
import type { WorkflowStageCompletionStatus } from '@/domain/buildcore/projectPipelineProgress';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowStageTaskCompletionPercent } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import styles from './ProjectCompletionBlockedDialog.module.css';

export type ProjectCompletionBlockedDialogProps = {
  readonly isOpen: boolean;
  readonly stageStatuses: readonly WorkflowStageCompletionStatus[] | null;
  readonly onClose: () => void;
};

function formatStageTaskCount(taskCount: number, taskSingular: string, taskPlural: string): string {
  return taskCount === 1 ? `1 ${taskSingular}` : `${taskCount} ${taskPlural}`;
}

export function ProjectCompletionBlockedDialog({
  isOpen,
  stageStatuses,
  onClose,
}: ProjectCompletionBlockedDialogProps): ReactElement | null {
  const detail = content.projectDetail;
  const wf = detail.workflow;

  if (!isOpen || stageStatuses == null || stageStatuses.length === 0) {
    return null;
  }

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={detail.markCompleteBlockedTitle}
      panelClassName={styles.dialogPanel}
      bodyClassName={styles.dialogBody}
      body={
        <>
          <p className={styles.stagesHeading}>{detail.markCompleteBlockedStagesHeading}</p>
          <ul className={styles.stageList}>
            {stageStatuses.map((stage) => {
              const taskCountText = formatStageTaskCount(
                stage.taskCount,
                wf.taskSingular,
                wf.taskPlural
              );
              const completionPercentLabel = formatWorkflowStageTaskCompletionPercent(
                stage.percentComplete
              );
              const statusLabel = stage.isComplete ? 'complete' : 'incomplete';

              return (
                <li
                  key={stage.stageSlug}
                  className={styles.stageItem}
                  aria-label={`${stage.stageLabel}: ${statusLabel}, ${taskCountText}, ${completionPercentLabel}`}
                >
                  <span className={styles.stageItemMain}>
                    {stage.isComplete ? (
                      <span className={styles.stageIconComplete} aria-hidden>
                        ✓
                      </span>
                    ) : (
                      <span className={styles.stageIconIncomplete} aria-hidden />
                    )}
                    <span
                      className={
                        stage.isComplete ? styles.stageLabelComplete : styles.stageLabelIncomplete
                      }
                    >
                      {stage.stageLabel}
                    </span>
                  </span>
                  <span className={styles.stageCountPill}>
                    {taskCountText} · {completionPercentLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      }
      cancelLabel={detail.markCompleteBlockedDismiss}
      onClose={onClose}
      closeAriaLabel={detail.markCompleteBlockedDismiss}
    />
  );
}
