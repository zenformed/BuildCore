'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import {
  isProjectPriorityUrgent,
  toggleProjectPriority,
} from '@/domain/crm/projectPriorityToggle';
import { getCrmProjectDetailBySlug, updateCrmProject } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  applySummaryFieldToForm,
  projectDetailToFormState,
  validateProjectDetailForm,
} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { crmRepositories } from '@/shared/di/container';

export function useCrmProjectTableRowActions(input: {
  onProjectUpdated: (summary: CrmProjectSummary) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}): {
  busyProjectId: string | null;
  togglePriority: (project: CrmProjectSummary) => Promise<void>;
} {
  const tableCopy = content.crm.table;
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const togglePriority = useCallback(
    async (project: CrmProjectSummary): Promise<void> => {
      if (busyProjectId != null || isCrmProjectComplete(project) || isCrmProjectInactive(project)) {
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

  return {
    busyProjectId,
    togglePriority,
  };
}
