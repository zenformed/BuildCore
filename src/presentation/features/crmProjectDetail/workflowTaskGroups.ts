import {
  DEFAULT_PIPELINE_STAGES,
  isPaymentWorkflowTask,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  PAYMENTS_WORKFLOW_COLLAPSE_KEY,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowStageCollapseKey,
} from '@/domain/crm';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { sortWorkflowTasksForDisplay } from './workflowTaskSort';

export function areAllStageTasksDone(tasks: readonly CrmWorkflowTask[]): boolean {
  return tasks.length > 0 && tasks.every((task) => task.status === 'done');
}

export type WorkflowTaskStageGroup = {
  readonly collapseKey: WorkflowStageCollapseKey;
  readonly stageSlug: PipelineStageSlug;
  readonly stageLabel: string;
  readonly isPaymentsGroup: boolean;
  readonly tasks: readonly CrmWorkflowTask[];
};

/** Operational pipeline stages available for workflow task creation (excludes payment milestone stage). */
export const OPS_PIPELINE_STAGES = DEFAULT_PIPELINE_STAGES.filter(
  (stage) => stage.slug !== PAYMENT_WORKFLOW_STAGE_SLUG
);

/** Max workflow task rows on the project detail preview (full page has no cap). */
export const WORKFLOW_TASKS_PREVIEW_LIMIT = 4;

/** Max pipeline stage sections on the project detail preview (e.g. New lead, Inspection scheduled). */
export const WORKFLOW_STAGES_PREVIEW_LIMIT = 3;

export function limitWorkflowTaskStageGroups(
  groups: readonly WorkflowTaskStageGroup[],
  maxStages: number
): readonly WorkflowTaskStageGroup[] {
  if (maxStages <= 0) return [];
  return groups.slice(0, maxStages);
}

export function createEmptyWorkflowTaskStageGroup(
  stageSlug: PipelineStageSlug
): WorkflowTaskStageGroup {
  return {
    collapseKey: stageSlug,
    stageSlug,
    stageLabel: formatWorkflowStageLabel(stageSlug),
    isPaymentsGroup: false,
    tasks: [],
  };
}

/** Include an empty stage section when adding a task to a stage with no rows yet. */
export function ensureWorkflowStageGroup(
  groups: readonly WorkflowTaskStageGroup[],
  stageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  if (groups.some((group) => group.stageSlug === stageSlug)) {
    return [...groups];
  }
  const empty = createEmptyWorkflowTaskStageGroup(stageSlug);
  const order = OPS_PIPELINE_STAGES.map((stage) => stage.slug);
  return [...groups, empty].sort(
    (a, b) => order.indexOf(a.stageSlug) - order.indexOf(b.stageSlug)
  );
}

/** Move a stage to the top of the list (e.g. while composing an inline draft on the detail preview). */
export function promoteWorkflowStageGroup(
  groups: readonly WorkflowTaskStageGroup[],
  stageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  const ensured = ensureWorkflowStageGroup(groups, stageSlug);
  const promoted = ensured.find((group) => group.stageSlug === stageSlug);
  if (promoted == null) return [...ensured];
  return [promoted, ...ensured.filter((group) => group.stageSlug !== stageSlug)];
}

/** First `maxTasks` tasks across stage groups (pipeline order), preserving group structure. */
export function limitWorkflowTaskGroups(
  groups: readonly WorkflowTaskStageGroup[],
  maxTasks: number
): WorkflowTaskStageGroup[] {
  if (maxTasks <= 0) return [];
  let remaining = maxTasks;
  const result: WorkflowTaskStageGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    if (group.tasks.length <= remaining) {
      result.push(group);
      remaining -= group.tasks.length;
    } else {
      result.push({
        ...group,
        tasks: group.tasks.slice(0, remaining),
      });
      remaining = 0;
    }
  }
  return result;
}

export function countWorkflowTasksInGroups(groups: readonly WorkflowTaskStageGroup[]): number {
  return groups.reduce((total, group) => total + group.tasks.length, 0);
}

/** Payment milestones for the Payments rail (not shown in workflow stage groups). */
export function listPaymentMilestones(tasks: readonly CrmWorkflowTask[]): CrmWorkflowTask[] {
  return tasks
    .filter(isPaymentWorkflowTask)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

/** Group operational workflow tasks by pipeline stage (excludes payment milestones). */
export function groupOpsWorkflowTasksByStage(
  tasks: readonly CrmWorkflowTask[],
  currentStageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  const opsTasks = tasks.filter((task) => !isPaymentWorkflowTask(task));
  const sortedOps = sortWorkflowTasksForDisplay(opsTasks, currentStageSlug);
  const byStage = new Map<PipelineStageSlug, CrmWorkflowTask[]>();

  for (const task of sortedOps) {
    const list = byStage.get(task.stageSlug) ?? [];
    list.push(task);
    byStage.set(task.stageSlug, list);
  }

  return DEFAULT_PIPELINE_STAGES.filter((stage) => byStage.has(stage.slug)).map((stage) => ({
    collapseKey: stage.slug,
    stageSlug: stage.slug,
    stageLabel: formatWorkflowStageLabel(stage.slug),
    isPaymentsGroup: false,
    tasks: byStage.get(stage.slug) ?? [],
  }));
}

/** @deprecated Use {@link groupOpsWorkflowTasksByStage} for workflow UI. */
export function groupWorkflowTasksByStage(
  tasks: readonly CrmWorkflowTask[],
  currentStageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  return groupOpsWorkflowTasksByStage(tasks, currentStageSlug);
}
