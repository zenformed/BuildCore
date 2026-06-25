'use client';

import { useCallback, useState } from 'react';
import type { CrmInactiveReason, CrmProjectSummary } from '@/domain/crm';
import { markCrmProjectsInactive } from '@/application/use-cases/crm/markCrmProjectsInactive';
import { markCrmProjectsActive } from '@/application/use-cases/crm/markCrmProjectsActive';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmWriteNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import type { MarkInactiveDialogTarget } from '@/presentation/components/CrmProjects/MarkInactiveDialog';

export function useCrmProjectInactiveActions(input: {
  onProjectsUpdated: (slugs: readonly string[]) => void;
  onMarkInactiveSuccess: (updatedCount: number) => void;
  onMarkActiveSuccess: (updatedCount: number) => void;
  onError: (message: string) => void;
}): {
  markInactiveTarget: MarkInactiveDialogTarget | null;
  openMarkInactive: (target: MarkInactiveDialogTarget) => void;
  closeMarkInactive: () => void;
  submitting: boolean;
  markingActive: boolean;
  markingActiveProjectId: string | null;
  submitMarkInactive: (values: {
    readonly reason: CrmInactiveReason;
    readonly customReason: string | null;
  }) => Promise<boolean>;
  markProjectActive: (project: CrmProjectSummary) => Promise<boolean>;
  markProjectsActive: (projects: readonly CrmProjectSummary[]) => Promise<boolean>;
} {
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const activeCopy = content.projectDetail.subprojects.markActive;
  const deleteCopy = content.crm.delete;
  const [markInactiveTarget, setMarkInactiveTarget] = useState<MarkInactiveDialogTarget | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [markingActive, setMarkingActive] = useState(false);
  const [markingActiveProjectId, setMarkingActiveProjectId] = useState<string | null>(null);

  const openMarkInactive = useCallback((target: MarkInactiveDialogTarget) => {
    setMarkInactiveTarget(target);
  }, []);

  const closeMarkInactive = useCallback(() => {
    if (submitting) return;
    setMarkInactiveTarget(null);
  }, [submitting]);

  const submitMarkInactive = useCallback(
    async (values: {
      readonly reason: CrmInactiveReason;
      readonly customReason: string | null;
    }): Promise<boolean> => {
      if (markInactiveTarget == null) return false;

      if (getCrmDataSource() !== 'api') {
        input.onError(deleteCopy.mockDisabledMessage);
        return false;
      }

      const projectSlugs =
        markInactiveTarget.mode === 'single'
          ? [markInactiveTarget.project.slug]
          : markInactiveTarget.projects.map((project) => project.slug);

      setSubmitting(true);
      try {
        const result = await markCrmProjectsInactive(crmRepositories, {
          projectSlugs,
          reason: values.reason,
          customReason: values.customReason,
        });

        if (result.updatedCount === 0) {
          input.onError(inactiveCopy.failed);
          return false;
        }

        input.onProjectsUpdated(result.updatedSlugs);

        if (result.failedSlugs.length > 0) {
          input.onError(inactiveCopy.partialFailure(result.updatedCount, result.failedSlugs.length));
        } else {
          input.onMarkInactiveSuccess(result.updatedCount);
        }

        setMarkInactiveTarget(null);
        return result.failedSlugs.length === 0;
      } catch (err) {
        if (err instanceof CrmWriteNotAvailableError) {
          input.onError(deleteCopy.mockDisabledMessage);
        } else {
          input.onError(err instanceof Error ? err.message : inactiveCopy.failed);
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [deleteCopy.mockDisabledMessage, inactiveCopy, input, markInactiveTarget]
  );

  const markProjectsActive = useCallback(
    async (projects: readonly CrmProjectSummary[]): Promise<boolean> => {
      const eligibleProjects = projects.filter((project) => project.subprojectStatus === 'inactive');
      if (eligibleProjects.length === 0) return false;

      if (getCrmDataSource() !== 'api') {
        input.onError(deleteCopy.mockDisabledMessage);
        return false;
      }

      setMarkingActive(true);
      try {
        const result = await markCrmProjectsActive(crmRepositories, {
          projectSlugs: eligibleProjects.map((project) => project.slug),
        });

        if (result.updatedCount === 0) {
          input.onError(activeCopy.failed);
          return false;
        }

        input.onProjectsUpdated(result.updatedSlugs);

        if (result.failedSlugs.length > 0) {
          input.onError(activeCopy.partialFailure(result.updatedCount, result.failedSlugs.length));
        } else {
          input.onMarkActiveSuccess(result.updatedCount);
        }

        return result.failedSlugs.length === 0;
      } catch (err) {
        if (err instanceof CrmWriteNotAvailableError) {
          input.onError(deleteCopy.mockDisabledMessage);
        } else {
          input.onError(err instanceof Error ? err.message : activeCopy.failed);
        }
        return false;
      } finally {
        setMarkingActive(false);
      }
    },
    [activeCopy, deleteCopy.mockDisabledMessage, input]
  );

  const markProjectActive = useCallback(
    async (project: CrmProjectSummary): Promise<boolean> => {
      setMarkingActiveProjectId(project.id);
      try {
        return await markProjectsActive([project]);
      } finally {
        setMarkingActiveProjectId(null);
      }
    },
    [markProjectsActive]
  );

  return {
    markInactiveTarget,
    openMarkInactive,
    closeMarkInactive,
    submitting,
    markingActive,
    markingActiveProjectId,
    submitMarkInactive,
    markProjectActive,
    markProjectsActive,
  };
}
