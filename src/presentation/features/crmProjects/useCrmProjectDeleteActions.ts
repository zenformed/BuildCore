'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { archiveCrmProject } from '@/application/use-cases/crm/archiveCrmProject';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { CrmWriteNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';

export function useCrmProjectDeleteActions(input: {
  onProjectDeleted: (projectId: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}): {
  deletingProjectId: string | null;
  deleteProject: (project: CrmProjectSummary) => Promise<boolean>;
} {
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const deleteCopy = content.crm.delete;

  const deleteProject = useCallback(
    async (project: CrmProjectSummary): Promise<boolean> => {
      if (!canMutateCrmProjectsInCurrentRuntime()) {
        input.onError(deleteCopy.mockDisabledMessage);
        return false;
      }

      setDeletingProjectId(project.id);
      try {
        const archived = await archiveCrmProject(crmRepositories, project.slug);
        if (!archived) {
          input.onError(deleteCopy.notFound);
          return false;
        }
        input.onProjectDeleted(project.id);
        input.onSuccess(deleteCopy.success);
        return true;
      } catch (err) {
        if (err instanceof CrmWriteNotAvailableError) {
          input.onError(deleteCopy.mockDisabledMessage);
        } else {
          input.onError(err instanceof Error ? err.message : deleteCopy.failed);
        }
        return false;
      } finally {
        setDeletingProjectId(null);
      }
    },
    [deleteCopy.failed, deleteCopy.mockDisabledMessage, deleteCopy.notFound, deleteCopy.success, input]
  );

  return { deletingProjectId, deleteProject };
}
