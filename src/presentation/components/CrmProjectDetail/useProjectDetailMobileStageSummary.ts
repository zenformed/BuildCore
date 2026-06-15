'use client';

import { useMemo } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import {
  resolveProjectDetailProgressDisplay,
  resolveWorkflowPipelineGraphState,
  type ProjectProgressDisplay,
} from '@/domain/buildcore/projectPipelineProgress';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';

export type ProjectDetailMobileStageSummaryData = {
  readonly progress: ProjectProgressDisplay;
  readonly stagePillLabel: string;
  readonly stagePositionLabel: string;
};

export function useProjectDetailMobileStageSummary(
  workflowTasks: readonly CrmWorkflowTask[],
  manualStageCompletions: readonly CrmProjectStageCompletion[]
): ProjectDetailMobileStageSummaryData | null {
  const { project, isMemberRole } = useProjectDetailShell();
  const { catalogForProject } = useBuildCorePipelineStages();
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });

  const graphState = useMemo(
    () =>
      resolveWorkflowPipelineGraphState({
        workflowTasks,
        stages: catalog,
        manualStageCompletions,
      }),
    [catalog, manualStageCompletions, workflowTasks]
  );

  const progress = useMemo(
    () =>
      resolveProjectDetailProgressDisplay({
        workflowTasks,
        manualStageCompletions,
        stages: catalog,
      }),
    [catalog, manualStageCompletions, workflowTasks]
  );

  const totalStages = graphState.stageStatuses.length;

  const { currentStageIndex, stagePillLabel } = useMemo(() => {
    if (totalStages === 0) {
      return { currentStageIndex: 0, stagePillLabel: '—' };
    }

    if (graphState.derivedCurrentStageSlug == null) {
      return {
        currentStageIndex: totalStages,
        stagePillLabel: formatStageLabel(CRM_PROJECT_COMPLETE_STAGE_SLUG, catalog),
      };
    }

    const currentIndex = graphState.stageStatuses.findIndex(
      (stage) => stage.stageSlug === graphState.derivedCurrentStageSlug
    );
    const stage = currentIndex >= 0 ? graphState.stageStatuses[currentIndex] : null;

    return {
      currentStageIndex: currentIndex >= 0 ? currentIndex + 1 : totalStages,
      stagePillLabel: stage?.stageLabel ?? formatStageLabel(graphState.derivedCurrentStageSlug, catalog),
    };
  }, [catalog, graphState.derivedCurrentStageSlug, graphState.stageStatuses, totalStages]);

  if (isMemberRole || totalStages === 0) {
    return null;
  }

  return {
    progress,
    stagePillLabel,
    stagePositionLabel: `${currentStageIndex}/${totalStages}`,
  };
}
