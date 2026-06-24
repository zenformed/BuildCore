'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { DestructiveConfirmationWorkflowDialog } from '@/presentation/components/DestructiveConfirmationWorkflow';
import {
  formatCrmProjectDeleteWorkflowItemLabel,
  type CrmProjectDeleteWorkflowCopy,
} from '@/presentation/features/crmProjects/crmProjectDeleteWorkflow';

export type CrmProjectDeleteWorkflowDialogProps = {
  readonly pendingProject: CrmProjectSummary | null;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly workflowCopy: CrmProjectDeleteWorkflowCopy;
  readonly confirmDisabled?: boolean;
};

export function CrmProjectDeleteWorkflowDialog({
  pendingProject,
  onClose,
  onConfirm,
  workflowCopy,
  confirmDisabled = false,
}: CrmProjectDeleteWorkflowDialogProps): ReactElement {
  const bulkDeleteCopy = content.bulkDelete;
  const destructiveWorkflowCopy = content.destructiveConfirmationWorkflow;

  return (
    <DestructiveConfirmationWorkflowDialog
      open={pendingProject != null}
      title={workflowCopy.title}
      itemTypeLabel={workflowCopy.itemLabel}
      selectedCount={pendingProject != null ? 1 : 0}
      selectedItemLabels={
        pendingProject != null ? [formatCrmProjectDeleteWorkflowItemLabel(pendingProject)] : []
      }
      selectedCountMessage={destructiveWorkflowCopy.selectedCountMessage(
        pendingProject != null ? 1 : 0,
        workflowCopy.itemLabel
      )}
      moreItemsLabel={destructiveWorkflowCopy.moreItems}
      consequenceDescription={workflowCopy.consequenceDescription}
      affectedDataSummary={workflowCopy.affectedDataSummary}
      irrevocableWarning={destructiveWorkflowCopy.irrevocableWarning}
      confirmationPhrase={bulkDeleteCopy.confirmPhrase}
      confirmationInstructions={destructiveWorkflowCopy.confirmationInstructions(
        bulkDeleteCopy.confirmPhrase
      )}
      intentActionLabel={workflowCopy.intentActionLabel}
      consequencesAcknowledgeLabel={destructiveWorkflowCopy.consequencesAcknowledgeLabel}
      finalActionLabel={workflowCopy.finalActionLabel}
      closeAriaLabel={destructiveWorkflowCopy.closeAriaLabel}
      confirmDisabled={confirmDisabled}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
