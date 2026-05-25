'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import type { WorkflowTaskCustomerNotifyPrompt } from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import type { WorkflowTaskCustomerNotifyFeedback } from '@/presentation/features/crmProjectDetail/useWorkflowTaskCustomerNotifyPrompt';

export type WorkflowTaskCustomerNotifyDialogProps = {
  readonly prompt: WorkflowTaskCustomerNotifyPrompt | null;
  readonly sending: boolean;
  readonly feedback: WorkflowTaskCustomerNotifyFeedback | null;
  readonly onClose: () => void;
  readonly onSendEmail: () => void;
};

export function WorkflowTaskCustomerNotifyDialog({
  prompt,
  sending,
  feedback,
  onClose,
  onSendEmail,
}: WorkflowTaskCustomerNotifyDialogProps): ReactElement | null {
  const copy = content.projectDetail.workflow.customerNotify;
  const hasEmail = prompt?.customerEmail != null;
  const successDismiss = feedback?.kind === 'success';

  return (
    <CenterConfirmDialog
      isOpen={prompt != null}
      title={copy.title}
      message={
        prompt == null
          ? undefined
          : hasEmail
            ? copy.messageWithEmail(prompt.customerName)
            : copy.messageNoEmail
      }
      feedback={feedback}
      cancelLabel={copy.notNow}
      confirmLabel={hasEmail && !successDismiss ? (sending ? copy.sending : copy.sendEmail) : undefined}
      onClose={onClose}
      onConfirm={hasEmail && !successDismiss ? onSendEmail : undefined}
      confirmDisabled={sending || prompt == null}
      cancelDisabled={sending}
      closeAriaLabel={copy.closeAriaLabel}
    />
  );
}
