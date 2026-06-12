'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import type { WorkflowTaskAssignedNotifyPrompt } from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import type { WorkflowTaskAssignedNotifyFeedback } from '@/presentation/features/crmProjectDetail/useWorkflowTaskCustomerNotifyPrompt';

export type WorkflowTaskCustomerNotifyDialogProps = {
  readonly prompt: WorkflowTaskAssignedNotifyPrompt | null;
  readonly sending: boolean;
  readonly feedback: WorkflowTaskAssignedNotifyFeedback | null;
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
  const copy = content.projectDetail.workflow.assignedNotify;
  const hasEmail = prompt?.recipientEmail != null;
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
              ? copy.messageWithEmail(prompt.recipientName)
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
