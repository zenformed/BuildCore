import { BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG } from '@/domain/buildcore/orgPipelineStages';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmProjectSummary } from './project';

/** Pipeline stage applied when a project is marked complete. */
export const CRM_PROJECT_COMPLETE_STAGE_SLUG =
  BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG satisfies PipelineStageSlug;

/** True when the project/customer has been marked complete. */
export function isCrmProjectComplete(summary: Pick<CrmProjectSummary, 'completedAt'>): boolean {
  return summary.completedAt != null;
}

export type SetCrmProjectCompletionInput = {
  readonly complete: boolean;
};
