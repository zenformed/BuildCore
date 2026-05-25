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
  const sent = feedback?.kind === 'success';

  return (
    <CenterConfirmDialog
      isOpen={prompt != null}
      title={sent ? copy.sentTitle : copy.title}
      message={
        sent
          ? undefined
          : prompt == null
            ? undefined
            : hasEmail
              ? copy.messageWithEmail(prompt.customerName)
              : copy.messageNoEmail
      }
      feedback={sent ? { kind: 'success', message: copy.success } : feedback}
      cancelLabel={copy.notNow}
      confirmLabel={hasEmail && !sent ? (sending ? copy.sending : copy.sendEmail) : undefined}
      onClose={onClose}
      onConfirm={hasEmail && !sent ? onSendEmail : undefined}
      confirmDisabled={sending || prompt == null}
      cancelDisabled={sending}
      hideActions={sent}
      closeAriaLabel={copy.closeAriaLabel}
    />
  );
}
