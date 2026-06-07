import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';

export type BuildCoreWorkflowTaskMemberVisibilityInput = {
  readonly viewerUserId: string;
  readonly onlyAssignedUserCanView: boolean;
  readonly memberRoleUserIds: readonly string[];
};

/** Fallback when an org has no saved visibility row: members see only self-assigned tasks. */
export const DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW = true;

export function isWorkflowTaskVisibleToBuildCoreMember(
  task: CrmWorkflowTask,
  input: BuildCoreWorkflowTaskMemberVisibilityInput
): boolean {
  if (isPaymentWorkflowTask(task)) return false;

  const assigneeId = task.assignedTo?.id?.trim();
  if (!assigneeId || isWorkflowTaskContactAssigneeId(assigneeId)) return false;

  if (input.onlyAssignedUserCanView) {
    return assigneeId === input.viewerUserId;
  }

  const memberIds = new Set(input.memberRoleUserIds);
  return memberIds.has(assigneeId);
}

export function filterWorkflowTasksForBuildCoreMember(
  tasks: readonly CrmWorkflowTask[],
  input: BuildCoreWorkflowTaskMemberVisibilityInput
): CrmWorkflowTask[] {
  return tasks.filter((task) => isWorkflowTaskVisibleToBuildCoreMember(task, input));
}

/** Strip financial / admin sections from a project detail payload for member viewers. */
export function applyBuildCoreMemberProjectDetailView(
  project: CrmProjectDetail,
  visibleTasks: readonly CrmWorkflowTask[]
): CrmProjectDetail {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));

  return {
    ...project,
    workflowTasks: visibleTasks,
    documents: project.documents.filter(
      (doc) => doc.workflowTaskId != null && visibleTaskIds.has(doc.workflowTaskId)
    ),
    accountabilityLog: [],
    milestonePayment: {
      ...project.milestonePayment,
      milestones: [],
    },
    budget: {
      entries: [],
      totalCostCents: 0,
      totalBudgetCents: 0,
      remainingCents: 0,
      categoryCosts: [],
    },
  };
}
