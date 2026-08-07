import { BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG } from '@/domain/buildcore/orgPipelineStages';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmProjectSummary } from './project';
import type { CrmProjectStatus } from './projectStatus';

/** Pipeline stage applied when a project is marked complete. */
export const CRM_PROJECT_COMPLETE_STAGE_SLUG =
  BUILDCORE_TERMINAL_PIPELINE_STAGE_SLUG satisfies PipelineStageSlug;

/**
 * True when Project/Subproject status is Completed.
 * Prefers shared domain `status` when present; falls back to legacy `completedAt`.
 */
export function isCrmProjectComplete(
  summary: Pick<CrmProjectSummary, 'completedAt'> & { readonly status?: CrmProjectStatus | null }
): boolean {
  if (summary.status != null) {
    return summary.status === 'completed';
  }
  return summary.completedAt != null;
}

export type SetCrmProjectCompletionInput = {
  readonly complete: boolean;
};
