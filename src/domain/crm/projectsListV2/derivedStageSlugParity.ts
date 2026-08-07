/**
 * TypeScript mirror of SQL public.crm_project_derived_stage_slug for parity tests.
 * First active stage that is not task-complete (empty stages count as current), else 'complete'.
 * Manual stage completions are ignored for derivation.
 */

import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '../projectCompletion';
import type { PipelineStageSlug } from '../pipelineStage';
import type { WorkflowTaskStatus } from '../workflowTask';
import { isWorkflowTaskComplete } from '@/domain/buildcore/projectPipelineProgress';

export type DerivedStageParityTask = {
  readonly stageSlug: string;
  readonly status: WorkflowTaskStatus;
  /** Payment milestones are excluded (amount set). */
  readonly isPayment: boolean;
};

export type DerivedStageParityInput = {
  readonly activeStageSlugsInOrder: readonly string[];
  readonly tasks: readonly DerivedStageParityTask[];
  /** @deprecated Ignored — empty stages no longer require manual completion. */
  readonly manualCompletedStageSlugs?: readonly string[];
};

export function computeCrmProjectDerivedStageSlugParity(
  input: DerivedStageParityInput
): PipelineStageSlug {
  const opsTasks = input.tasks.filter((task) => !task.isPayment);

  for (const slug of input.activeStageSlugsInOrder) {
    const stageTasks = opsTasks.filter((task) => task.stageSlug === slug);
    if (stageTasks.length === 0) {
      // Empty stage remains on the visual roadmap as the current stage.
      return slug;
    }
    const allDone = stageTasks.every((task) => isWorkflowTaskComplete(task));
    if (!allDone) return slug;
  }

  return CRM_PROJECT_COMPLETE_STAGE_SLUG;
}
