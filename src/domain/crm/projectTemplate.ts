import { isPaymentWorkflowTask } from './paymentWorkflow';
import type { PipelineStageSlug } from './pipelineStage';
import type { BuildCoreProjectTemplateScope } from './projectTemplateScope';
import type { CrmWorkflowTask } from './workflowTask';

/** Blueprint item saved on a project template (non-payment workflow task). */
export type BuildCoreProjectTemplateWorkflowTaskBlueprint = {
  readonly stageKey: PipelineStageSlug;
  readonly taskName: string;
  readonly documentsRequired: boolean;
};

/** Blueprint item saved on a project template (payment milestone). */
export type BuildCoreProjectTemplatePaymentBlueprint = {
  readonly title: string;
  /** Amount in major currency units (e.g. USD dollars). */
  readonly amount: number;
  readonly documentsRequired: boolean;
};

export type BuildCoreProjectTemplate = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly workflowTasksPayload: readonly BuildCoreProjectTemplateWorkflowTaskBlueprint[];
  readonly paymentsPayload: readonly BuildCoreProjectTemplatePaymentBlueprint[];
  readonly isDefault: boolean;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BuildCoreProjectTemplateBlueprints = {
  readonly workflowTasksPayload: readonly BuildCoreProjectTemplateWorkflowTaskBlueprint[];
  readonly paymentsPayload: readonly BuildCoreProjectTemplatePaymentBlueprint[];
};

/**
 * Snapshot current project workflow tasks into template payloads.
 * Excludes status, assignments, due dates, notes, documents, and timestamps.
 */
export function snapshotProjectTemplateBlueprintsFromWorkflowTasks(
  tasks: readonly CrmWorkflowTask[]
): BuildCoreProjectTemplateBlueprints {
  const ordered = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const workflowTasksPayload: BuildCoreProjectTemplateWorkflowTaskBlueprint[] = [];
  const paymentsPayload: BuildCoreProjectTemplatePaymentBlueprint[] = [];

  for (const task of ordered) {
    if (isPaymentWorkflowTask(task)) {
      paymentsPayload.push({
        title: task.title.trim(),
        amount: (task.amountCents ?? 0) / 100,
        documentsRequired: task.documentsRequired,
      });
      continue;
    }

    workflowTasksPayload.push({
      stageKey: task.stageSlug,
      taskName: task.title.trim(),
      documentsRequired: task.documentsRequired,
    });
  }

  return { workflowTasksPayload, paymentsPayload };
}
