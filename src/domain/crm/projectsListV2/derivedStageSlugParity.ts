/**
 * TypeScript mirror of SQL public.crm_project_derived_stage_slug for parity tests.
 * Must stay aligned with resolveDerivedWorkflowStageSlugFromProgressInput semantics:
 * first incomplete active stage (ops tasks / manual completions), else 'complete'.
 */

import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '../projectCompletion';
import type { PipelineStageSlug } from '../pipelineStage';
import type { WorkflowTaskStatus } from '../workflowTask';

export type DerivedStageParityTask = {
  readonly stageSlug: string;
  readonly status: WorkflowTaskStatus;
  /** Payment milestones are excluded (amount set). */
  readonly isPayment: boolean;
};

export type DerivedStageParityInput = {
  readonly activeStageSlugsInOrder: readonly string[];
  readonly tasks: readonly DerivedStageParityTask[];
  readonly manualCompletedStageSlugs: readonly string[];
};

export function computeCrmProjectDerivedStageSlugParity(
  input: DerivedStageParityInput
): PipelineStageSlug {
  const opsTasks = input.tasks.filter((task) => !task.isPayment);
  const manual = new Set(input.manualCompletedStageSlugs);

  for (const slug of input.activeStageSlugsInOrder) {
    const stageTasks = opsTasks.filter((task) => task.stageSlug === slug);
    if (stageTasks.length > 0) {
      const allDone = stageTasks.every((task) => task.status === 'done');
      if (!allDone) return slug;
      continue;
    }
    if (!manual.has(slug)) return slug;
  }

  return CRM_PROJECT_COMPLETE_STAGE_SLUG;
}
