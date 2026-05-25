'use client';

import { useCallback, useState } from 'react';
import type { CrmContact } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { notifyWorkflowTaskCustomer } from '@/infrastructure/crm/api/notifyWorkflowTaskCustomer';
import {
  shouldOfferWorkflowTaskCustomerNotify,
  workflowTaskCustomerNotifyPromptFromContact,
  type WorkflowTaskCustomerNotifyPrompt,
} from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';

export type WorkflowTaskCustomerNotifyFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
};

export function useWorkflowTaskCustomerNotifyPrompt(projectContact: CrmContact) {
  const copy = content.projectDetail.workflow.customerNotify;
  const [prompt, setPrompt] = useState<WorkflowTaskCustomerNotifyPrompt | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<WorkflowTaskCustomerNotifyFeedback | null>(null);

  const closePrompt = useCallback(() => {
    setPrompt(null);
    setFeedback(null);
    setSending(false);
  }, []);

  const requestPromptAfterAssigneeChange = useCallback(
    (
      isApiSource: boolean,
      taskId: string,
      previousAssigneeId: string | null | undefined,
      newAssigneeId: string
    ) => {
      if (
        !shouldOfferWorkflowTaskCustomerNotify({
          isApiSource,
          previousAssigneeId,
          newAssigneeId,
        })
      ) {
        return;
      }
      setFeedback(null);
      setPrompt(workflowTaskCustomerNotifyPromptFromContact(taskId, projectContact));
    },
    [projectContact]
  );

  const sendCustomerNotifyEmail = useCallback(async () => {
    if (prompt == null || prompt.customerEmail == null || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      await notifyWorkflowTaskCustomer(prompt.taskId);
      setFeedback({ kind: 'success', message: copy.success });
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message.trim()
          ? err.message
          : copy.sendFailed;
      setFeedback({ kind: 'error', message });
    } finally {
      setSending(false);
    }
  }, [copy.sendFailed, copy.success, prompt, sending]);

  return {
    customerNotifyPrompt: prompt,
    customerNotifySending: sending,
    customerNotifyFeedback: feedback,
    closeCustomerNotifyPrompt: closePrompt,
    requestCustomerNotifyAfterAssigneeChange: requestPromptAfterAssigneeChange,
    sendCustomerNotifyEmail,
  };
}
