import {
  DEFAULT_PIPELINE_STAGES,
  isPaymentWorkflowTask,
  PAYMENTS_WORKFLOW_COLLAPSE_KEY,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowStageCollapseKey,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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

export const WORKFLOW_TASKS_PREVIEW_LIMIT = 5;

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

/** Group ops tasks by pipeline stage; payment milestones under **Payments**. */
export function groupWorkflowTasksByStage(
  tasks: readonly CrmWorkflowTask[],
  currentStageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  const paymentTasks = tasks.filter(isPaymentWorkflowTask);
  const opsTasks = tasks.filter((task) => !isPaymentWorkflowTask(task));
  const sortedOps = sortWorkflowTasksForDisplay(opsTasks, currentStageSlug);
  const byStage = new Map<PipelineStageSlug, CrmWorkflowTask[]>();

  for (const task of sortedOps) {
    const list = byStage.get(task.stageSlug) ?? [];
    list.push(task);
    byStage.set(task.stageSlug, list);
  }

  const groups: WorkflowTaskStageGroup[] = DEFAULT_PIPELINE_STAGES.filter((stage) =>
    byStage.has(stage.slug)
  ).map((stage) => ({
    collapseKey: stage.slug,
    stageSlug: stage.slug,
    stageLabel: formatWorkflowStageLabel(stage.slug),
    isPaymentsGroup: false,
    tasks: byStage.get(stage.slug) ?? [],
  }));

  if (paymentTasks.length > 0) {
    const sortedPayments = [...paymentTasks].sort((a, b) => a.sortOrder - b.sortOrder);
    groups.push({
      collapseKey: PAYMENTS_WORKFLOW_COLLAPSE_KEY,
      stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
      stageLabel: content.projectDetail.workflow.paymentsGroupLabel,
      isPaymentsGroup: true,
      tasks: sortedPayments,
    });
  }

  return groups;
}
