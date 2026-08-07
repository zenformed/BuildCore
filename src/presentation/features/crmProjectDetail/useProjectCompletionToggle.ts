'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import { countIncompleteWorkflowTasks } from '@/domain/buildcore/projectPipelineProgress';
import { setCrmProjectCompletion } from '@/application/use-cases/crm/setCrmProjectCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import {
  incompleteTaskCountFromConfirmationError,
  isCrmProjectCompletionConfirmationRequired,
} from '@/presentation/features/crmProjectDetail/crmProjectCompletionConfirmation';

export function useProjectCompletionToggle(
  initialProject: CrmProjectDetail,
  options?: {
    readonly onRefresh?: () => Promise<void>;
    readonly stages?: readonly PipelineStage[] | null;
  }
): {
  project: CrmProjectDetail;
  setProject: (project: CrmProjectDetail) => void;
  isComplete: boolean;
  completionBusy: boolean;
  completionConfirm: 'complete' | 'incomplete' | null;
  setCompletionConfirm: (value: 'complete' | 'incomplete' | null) => void;
  incompleteTasksWarningCount: number | null;
  setIncompleteTasksWarningCount: (value: number | null) => void;
  /** @deprecated Prefer incompleteTasksWarningCount */
  completionBlockedStageStatuses: null;
  setCompletionBlockedStageStatuses: (value: unknown) => void;
  requestMarkComplete: () => void;
  requestMarkIncomplete: () => void;
  confirmCompletionChange: () => Promise<boolean>;
  confirmCompleteAnyway: () => Promise<boolean>;
} {
  const [project, setProject] = useState(initialProject);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [completionConfirm, setCompletionConfirm] = useState<'complete' | 'incomplete' | null>(
    null
  );
  const [incompleteTasksWarningCount, setIncompleteTasksWarningCount] = useState<number | null>(
    null
  );

  const isComplete = isCrmProjectComplete(project.summary);
  const c = content.projectDetail;
  const onRefresh = options?.onRefresh;

  const applyCompletion = useCallback(
    async (complete: boolean, confirmIncompleteTasks: boolean): Promise<'ok' | 'needs_confirmation'> => {
      setCompletionBusy(true);
      try {
        const updated = await setCrmProjectCompletion(
          crmRepositories,
          project.summary.slug,
          complete,
          confirmIncompleteTasks ? { confirmIncompleteTasks: true } : undefined
        );
        if (updated == null) {
          throw new Error(c.markCompleteFailed);
        }
        setProject(updated);
        if (onRefresh) {
          await onRefresh();
        }
        return 'ok';
      } catch (error) {
        if (
          complete &&
          !confirmIncompleteTasks &&
          isCrmProjectCompletionConfirmationRequired(error)
        ) {
          setIncompleteTasksWarningCount(incompleteTaskCountFromConfirmationError(error));
          return 'needs_confirmation';
        }
        throw error;
      } finally {
        setCompletionBusy(false);
      }
    },
    [onRefresh, project.summary.slug, c.markCompleteFailed]
  );

  const confirmCompletionChange = useCallback(async (): Promise<boolean> => {
    if (completionConfirm == null) return false;
    const complete = completionConfirm === 'complete';
    setCompletionConfirm(null);
    const result = await applyCompletion(complete, false);
    return result === 'ok';
  }, [applyCompletion, completionConfirm]);

  const confirmCompleteAnyway = useCallback(async (): Promise<boolean> => {
    setIncompleteTasksWarningCount(null);
    const result = await applyCompletion(true, true);
    return result === 'ok';
  }, [applyCompletion]);

  const requestMarkComplete = useCallback(() => {
    const incompleteCount = countIncompleteWorkflowTasks(project.workflowTasks);
    if (incompleteCount > 0) {
      setIncompleteTasksWarningCount(incompleteCount);
      return;
    }
    setCompletionConfirm('complete');
  }, [project.workflowTasks]);

  return {
    project,
    setProject,
    isComplete,
    completionBusy,
    completionConfirm,
    setCompletionConfirm,
    incompleteTasksWarningCount,
    setIncompleteTasksWarningCount,
    completionBlockedStageStatuses: null,
    setCompletionBlockedStageStatuses: () => undefined,
    requestMarkComplete,
    requestMarkIncomplete: () => setCompletionConfirm('incomplete'),
    confirmCompletionChange,
    confirmCompleteAnyway,
  };
}
