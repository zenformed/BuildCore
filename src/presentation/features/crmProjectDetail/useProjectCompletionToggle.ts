'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import {
  listWorkflowStageCompletionStatuses,
  type WorkflowStageCompletionStatus,
} from '@/domain/buildcore/projectPipelineProgress';
import { setCrmProjectCompletion } from '@/application/use-cases/crm/setCrmProjectCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';

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
  completionBlockedStageStatuses: readonly WorkflowStageCompletionStatus[] | null;
  setCompletionBlockedStageStatuses: (value: readonly WorkflowStageCompletionStatus[] | null) => void;
  requestMarkComplete: () => void;
  requestMarkIncomplete: () => void;
  confirmCompletionChange: () => Promise<void>;
} {
  const [project, setProject] = useState(initialProject);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [completionConfirm, setCompletionConfirm] = useState<'complete' | 'incomplete' | null>(
    null
  );
  const [completionBlockedStageStatuses, setCompletionBlockedStageStatuses] = useState<
    readonly WorkflowStageCompletionStatus[] | null
  >(null);

  const isComplete = isCrmProjectComplete(project.summary);
  const c = content.projectDetail;
  const stages = options?.stages;
  const onRefresh = options?.onRefresh;

  const confirmCompletionChange = useCallback(async () => {
    if (completionConfirm == null) return;
    const complete = completionConfirm === 'complete';
    setCompletionBusy(true);
    setCompletionConfirm(null);
    try {
      const updated = await setCrmProjectCompletion(
        crmRepositories,
        project.summary.slug,
        complete
      );
      if (updated == null) {
        throw new Error(c.markCompleteFailed);
      }
      setProject(updated);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setCompletionBusy(false);
    }
  }, [completionConfirm, onRefresh, project.summary.slug, c.markCompleteFailed]);

  const requestMarkComplete = useCallback(() => {
    const stageStatuses = listWorkflowStageCompletionStatuses(project.workflowTasks, stages);
    if (stageStatuses.some((stage) => !stage.isComplete)) {
      setCompletionBlockedStageStatuses(stageStatuses);
      return;
    }
    setCompletionConfirm('complete');
  }, [project.workflowTasks, stages]);

  return {
    project,
    setProject,
    isComplete,
    completionBusy,
    completionConfirm,
    setCompletionConfirm,
    completionBlockedStageStatuses,
    setCompletionBlockedStageStatuses,
    requestMarkComplete,
    requestMarkIncomplete: () => setCompletionConfirm('incomplete'),
    confirmCompletionChange,
  };
}
