'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmContact, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { notifyWorkflowTaskAssigned } from '@/infrastructure/crm/api/notifyWorkflowTaskAssigned';
import { notifyWorkflowTaskCustomer } from '@/infrastructure/crm/api/notifyWorkflowTaskCustomer';
import {
  shouldOfferWorkflowTaskCustomerNotify,
  workflowTaskAssignedNotifyPromptFromTask,
  workflowTaskCustomerNotifyPromptFromContact,
  type WorkflowTaskAssignedNotifyPrompt,
} from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';

export type WorkflowTaskAssignedNotifyFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
};

/** @deprecated Use WorkflowTaskAssignedNotifyFeedback */
export type WorkflowTaskCustomerNotifyFeedback = WorkflowTaskAssignedNotifyFeedback;

const ASSIGNED_NOTIFY_SUCCESS_AUTO_CLOSE_MS = 2500;

export function useWorkflowTaskAssignedNotifyPrompt(projectContact: CrmContact) {
  const copy = content.projectDetail.workflow.assignedNotify;
  const [prompt, setPrompt] = useState<WorkflowTaskAssignedNotifyPrompt | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<WorkflowTaskAssignedNotifyFeedback | null>(null);

  const closePrompt = useCallback(() => {
    setPrompt(null);
    setFeedback(null);
    setSending(false);
  }, []);

  const openAssignedNotifyPromptForTask = useCallback(
    (task: CrmWorkflowTask) => {
      const nextPrompt = workflowTaskAssignedNotifyPromptFromTask(task, projectContact);
      if (nextPrompt == null) return;
      setFeedback(null);
      setPrompt(nextPrompt);
    },
    [projectContact]
  );

  const openCustomerNotifyPromptForTask = useCallback(
    (taskId: string) => {
      setFeedback(null);
      setPrompt(workflowTaskCustomerNotifyPromptFromContact(taskId, projectContact));
    },
    [projectContact]
  );

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
      openCustomerNotifyPromptForTask(taskId);
    },
    [openCustomerNotifyPromptForTask]
  );

  const sendAssignedNotifyEmail = useCallback(async () => {
    if (prompt == null || prompt.recipientEmail == null || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      if (prompt.kind === 'customer') {
        await notifyWorkflowTaskCustomer(prompt.taskId);
      } else {
        await notifyWorkflowTaskAssigned(prompt.taskId);
      }
      setFeedback({ kind: 'success', message: copy.success });
    } catch (err) {
      const message =
        err instanceof CrmApiError && err.message.trim() ? err.message : copy.sendFailed;
      setFeedback({ kind: 'error', message });
    } finally {
      setSending(false);
    }
  }, [copy.sendFailed, copy.success, prompt, sending]);

  useEffect(() => {
    if (feedback?.kind !== 'success') return;
    const timer = setTimeout(() => closePrompt(), ASSIGNED_NOTIFY_SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closePrompt, feedback]);

  return {
    assignedNotifyPrompt: prompt,
    assignedNotifySending: sending,
    assignedNotifyFeedback: feedback,
    closeAssignedNotifyPrompt: closePrompt,
    requestAssignedNotifyAfterAssigneeChange: requestPromptAfterAssigneeChange,
    openAssignedNotifyPromptForTask,
    sendAssignedNotifyEmail,
    customerNotifyPrompt: prompt,
    customerNotifySending: sending,
    customerNotifyFeedback: feedback,
    closeCustomerNotifyPrompt: closePrompt,
    requestCustomerNotifyAfterAssigneeChange: requestPromptAfterAssigneeChange,
    openCustomerNotifyPromptForTask,
    sendCustomerNotifyEmail: sendAssignedNotifyEmail,
  };
}

/** @deprecated Use useWorkflowTaskAssignedNotifyPrompt */
export const useWorkflowTaskCustomerNotifyPrompt = useWorkflowTaskAssignedNotifyPrompt;
