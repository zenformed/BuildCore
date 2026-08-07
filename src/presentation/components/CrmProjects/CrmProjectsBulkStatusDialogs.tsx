'use client';

import type { ReactElement } from 'react';
import type { CrmLossReason } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionWarningDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { MarkInactiveDialog } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import type { useCrmProjectsBulkStatusChange } from '@/presentation/features/crmProjects/useCrmProjectsBulkStatusChange';

export type CrmProjectsBulkStatusDialogsProps = {
  readonly statusChange: ReturnType<typeof useCrmProjectsBulkStatusChange>;
  readonly selectedCount: number;
  readonly onError: (message: string) => void;
};

/** Shared Lost / Cancelled / Complete-Anyway dialogs for Projects + Subprojects bulk Change Status. */
export function CrmProjectsBulkStatusDialogs({
  statusChange,
  selectedCount,
  onError,
}: CrmProjectsBulkStatusDialogsProps): ReactElement {
  const statusCopy = content.projectDetail.projectStatus;

  return (
    <>
      <ProjectCompletionWarningDialog
        isOpen={statusChange.incompleteTasksWarningCount != null}
        incompleteTaskCount={statusChange.incompleteTasksWarningCount ?? 0}
        onClose={() => statusChange.setIncompleteTasksWarningCount(null)}
        onConfirm={() => {
          void statusChange.confirmCompleteAnyway().catch(() => onError(statusCopy.failed));
        }}
      />
      <ConfirmModal
        isOpen={statusChange.cancelledConfirmOpen}
        onClose={statusChange.closeCancelledConfirm}
        onConfirm={() => {
          void statusChange.confirmCancelled().catch(() => onError(statusCopy.failed));
        }}
        title={
          selectedCount > 1
            ? statusCopy.bulkCancelledConfirmTitle
            : statusCopy.cancelledConfirmTitle
        }
        message={
          selectedCount > 1
            ? statusCopy.bulkCancelledConfirmMessage(selectedCount)
            : statusCopy.cancelledConfirmMessage
        }
        confirmLabel={statusCopy.cancelledConfirmLabel}
        cancelLabel={statusCopy.cancelledConfirmCancel}
        variant="primary"
        hideIcon
      />
      <MarkInactiveDialog
        target={statusChange.lostDialogTarget}
        submitting={statusChange.busy}
        variant="lost"
        onClose={statusChange.closeLostDialog}
        onSubmit={(values) => {
          void statusChange.submitLost({
            reason: values.reason as CrmLossReason,
            customReason: values.customReason,
          });
        }}
      />
    </>
  );
}
