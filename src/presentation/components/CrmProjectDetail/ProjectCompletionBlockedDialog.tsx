'use client';

import type { ReactElement } from 'react';
import type { WorkflowStageCompletionStatus } from '@/domain/buildcore/projectPipelineProgress';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import styles from './ProjectCompletionBlockedDialog.module.css';

export type ProjectCompletionBlockedDialogProps = {
  readonly isOpen: boolean;
  readonly stageStatuses: readonly WorkflowStageCompletionStatus[] | null;
  readonly onClose: () => void;
};

export function ProjectCompletionBlockedDialog({
  isOpen,
  stageStatuses,
  onClose,
}: ProjectCompletionBlockedDialogProps): ReactElement | null {
  const detail = content.projectDetail;

  if (!isOpen || stageStatuses == null || stageStatuses.length === 0) {
    return null;
  }

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={detail.markCompleteBlockedTitle}
      body={
        <>
          <p className={styles.stagesHeading}>{detail.markCompleteBlockedStagesHeading}</p>
          <ul className={styles.stageList}>
            {stageStatuses.map((stage) => (
              <li
                key={stage.stageSlug}
                className={styles.stageItem}
                aria-label={`${stage.stageLabel}: ${stage.isComplete ? 'complete' : 'incomplete'}`}
              >
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
              </li>
            ))}
          </ul>
        </>
      }
      cancelLabel={detail.markCompleteBlockedDismiss}
      onClose={onClose}
      closeAriaLabel={detail.markCompleteBlockedDismiss}
    />
  );
}
