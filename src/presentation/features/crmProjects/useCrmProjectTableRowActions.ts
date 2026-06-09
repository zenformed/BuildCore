'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import {
  isProjectPriorityUrgent,
  toggleProjectPriority,
} from '@/domain/crm/projectPriorityToggle';
import {
  getCrmProjectDetailBySlug,
  setCrmProjectCompletion,
  updateCrmProject,
} from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  applySummaryFieldToForm,
  projectDetailToFormState,
  validateProjectDetailForm,
} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { crmRepositories } from '@/shared/di/container';

export type PendingCrmProjectCompletionChange = {
  readonly project: CrmProjectSummary;
  readonly complete: boolean;
};

export function useCrmProjectTableRowActions(input: {
  onProjectUpdated: (summary: CrmProjectSummary) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}): {
  busyProjectId: string | null;
  pendingCompletionChange: PendingCrmProjectCompletionChange | null;
  setPendingCompletionChange: (value: PendingCrmProjectCompletionChange | null) => void;
  togglePriority: (project: CrmProjectSummary) => Promise<void>;
  requestCompletionChange: (project: CrmProjectSummary) => void;
  confirmCompletionChange: () => Promise<void>;
} {
  const tableCopy = content.crm.table;
  const detailCopy = content.projectDetail;
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [pendingCompletionChange, setPendingCompletionChange] =
    useState<PendingCrmProjectCompletionChange | null>(null);

  const togglePriority = useCallback(
    async (project: CrmProjectSummary): Promise<void> => {
      if (busyProjectId != null || isCrmProjectComplete(project)) {
        return;
      }

      const removingPriority = isProjectPriorityUrgent(project.priority);
      const nextPriority = toggleProjectPriority(project.priority);

      setBusyProjectId(project.id);
      try {
        const detail = await getCrmProjectDetailBySlug(crmRepositories, project.slug);
        if (detail == null) {
          throw new Error(tableCopy.makePriorityFailed);
        }

        const form = applySummaryFieldToForm(
          projectDetailToFormState(detail),
          'priority',
          nextPriority
        );
        const validated = validateProjectDetailForm(form, detail);
        if (!validated.ok) {
          throw new Error(validated.message);
        }

        const updated = await updateCrmProject(crmRepositories, project.slug, validated.input);
        if (updated == null) {
          throw new Error(tableCopy.makePriorityFailed);
        }
        input.onProjectUpdated(updated.summary);
        input.onSuccess(
          removingPriority ? tableCopy.removePrioritySuccess : tableCopy.makePrioritySuccess
        );
      } catch {
        input.onError(tableCopy.makePriorityFailed);
      } finally {
        setBusyProjectId(null);
      }
    },
    [
      busyProjectId,
      input,
      tableCopy.makePriorityFailed,
      tableCopy.makePrioritySuccess,
      tableCopy.removePrioritySuccess,
    ]
  );

  const requestCompletionChange = useCallback(
    (project: CrmProjectSummary): void => {
      if (busyProjectId != null) {
        return;
      }
      setPendingCompletionChange({
        project,
        complete: !isCrmProjectComplete(project),
      });
    },
    [busyProjectId]
  );

  const confirmCompletionChange = useCallback(async (): Promise<void> => {
    if (pendingCompletionChange == null) return;

    const { project, complete } = pendingCompletionChange;
    setPendingCompletionChange(null);
    setBusyProjectId(project.id);
    try {
      const updated = await setCrmProjectCompletion(crmRepositories, project.slug, complete);
      if (updated == null) {
        throw new Error(detailCopy.markCompleteFailed);
      }
      input.onProjectUpdated(updated.summary);
      input.onSuccess(
        complete ? detailCopy.markCompleteSuccess : detailCopy.markIncompleteSuccess
      );
    } catch {
      input.onError(detailCopy.markCompleteFailed);
    } finally {
      setBusyProjectId(null);
    }
  }, [detailCopy.markCompleteFailed, detailCopy.markCompleteSuccess, detailCopy.markIncompleteSuccess, input, pendingCompletionChange]);

  return {
    busyProjectId,
    pendingCompletionChange,
    setPendingCompletionChange,
    togglePriority,
    requestCompletionChange,
    confirmCompletionChange,
  };
}
