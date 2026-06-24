'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { bulkArchiveCrmProjects } from '@/application/use-cases/crm/bulkArchiveCrmProjects';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmWriteNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';

export function useCrmProjectBulkDeleteActions(input: {
  onProjectsDeleted: (projectIds: readonly string[]) => void;
  onSuccess: (deletedCount: number) => void;
  onError: (message: string) => void;
}): {
  deleting: boolean;
  deleteProjects: (projects: readonly CrmProjectSummary[]) => Promise<boolean>;
} {
  const [deleting, setDeleting] = useState(false);
  const deleteCopy = content.crm.delete;
  const bulkDeleteCopy = content.bulkDelete;

  const deleteProjects = useCallback(
    async (projects: readonly CrmProjectSummary[]): Promise<boolean> => {
      if (projects.length === 0) return false;

      if (getCrmDataSource() !== 'api') {
        input.onError(deleteCopy.mockDisabledMessage);
        return false;
      }

      setDeleting(true);
      try {
        const result = await bulkArchiveCrmProjects(
          crmRepositories,
          projects.map((project) => project.slug)
        );

        if (result.deletedCount === 0) {
          input.onError(bulkDeleteCopy.failed);
          return false;
        }

        const deletedIdSet = new Set(
          projects.filter((project) => result.deletedSlugs.includes(project.slug)).map((p) => p.id)
        );
        input.onProjectsDeleted([...deletedIdSet]);

        if (result.failedSlugs.length > 0) {
          input.onError(
            bulkDeleteCopy.partialFailure(result.deletedCount, result.failedSlugs.length)
          );
        } else {
          input.onSuccess(result.deletedCount);
        }

        return result.failedSlugs.length === 0;
      } catch (err) {
        if (err instanceof CrmWriteNotAvailableError) {
          input.onError(deleteCopy.mockDisabledMessage);
        } else {
          input.onError(err instanceof Error ? err.message : bulkDeleteCopy.failed);
        }
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [
      bulkDeleteCopy.failed,
      bulkDeleteCopy.partialFailure,
      bulkDeleteCopy,
      deleteCopy.mockDisabledMessage,
      input,
    ]
  );

  return { deleting, deleteProjects };
}
