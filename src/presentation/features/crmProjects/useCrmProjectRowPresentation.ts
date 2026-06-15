'use client';

import { useMemo } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { PipelineStageSlug } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import type { ProjectProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import {
  resolveDerivedWorkflowStageSlugFromProgressIndex,
  resolveProjectWorkflowProgressDisplayFromIndex,
} from '@/domain/buildcore/projectPipelineProgress';
import { getProjectIndustrySubtitle } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';

export type CrmProjectRowPresentation = {
  readonly catalog: readonly PipelineStage[];
  readonly industrySubtitle: string | null;
  readonly progress: ProjectProgressDisplay | null;
  readonly derivedStageSlug: PipelineStageSlug | null;
};

export function useCrmProjectRowPresentation(
  project: CrmProjectSummary,
  workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex | undefined,
  isWorkflowProgressLoading: boolean
): CrmProjectRowPresentation {
  const { getCatalog } = useBuildCorePipelineStages();
  const catalog = getCatalog(
    resolvePipelineStageScopeForProject({ parentProjectId: project.parentProjectId })
  );
  const industrySubtitle = getProjectIndustrySubtitle(project.industry, project.customIndustry);

  const progress = useMemo(() => {
    if (workflowProgressInputIndex == null || isWorkflowProgressLoading) {
      return null;
    }
    return resolveProjectWorkflowProgressDisplayFromIndex({
      summary: project,
      workflowProgressInputIndex,
      stages: catalog,
    });
  }, [catalog, isWorkflowProgressLoading, project, workflowProgressInputIndex]);

  const derivedStageSlug = useMemo(() => {
    if (workflowProgressInputIndex == null || isWorkflowProgressLoading) {
      return null;
    }
    return resolveDerivedWorkflowStageSlugFromProgressIndex({
      summary: project,
      workflowProgressInputIndex,
      stages: catalog,
    });
  }, [catalog, isWorkflowProgressLoading, project, workflowProgressInputIndex]);

  return { catalog, industrySubtitle, progress, derivedStageSlug };
}
