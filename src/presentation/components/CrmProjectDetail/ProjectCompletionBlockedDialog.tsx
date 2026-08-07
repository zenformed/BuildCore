'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatIncompleteTasksCompletionWarning } from '@/domain/crm/setCrmProjectsStatus';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import styles from './ProjectCompletionBlockedDialog.module.css';

export type ProjectCompletionWarningDialogProps = {
  readonly isOpen: boolean;
  readonly incompleteTaskCount: number;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

/** Warns when marking Project Completed while incomplete workflow tasks remain. */
export function ProjectCompletionWarningDialog({
  isOpen,
  incompleteTaskCount,
  onClose,
  onConfirm,
}: ProjectCompletionWarningDialogProps): ReactElement | null {
  const detail = content.projectDetail;

  if (!isOpen || incompleteTaskCount <= 0) {
    return null;
  }

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={detail.markCompleteIncompleteTasksTitle}
      panelClassName={styles.dialogPanel}
      bodyClassName={styles.dialogBody}
      message={formatIncompleteTasksCompletionWarning(incompleteTaskCount)}
      cancelLabel={detail.markCompleteIncompleteTasksCancel}
      confirmLabel={detail.markCompleteIncompleteTasksConfirm}
      onClose={onClose}
      onConfirm={onConfirm}
      closeAriaLabel={detail.markCompleteIncompleteTasksCancel}
    />
  );
}

/** @deprecated Use ProjectCompletionWarningDialog */
export const ProjectCompletionBlockedDialog = ProjectCompletionWarningDialog;
