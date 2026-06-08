import type { CrmBudgetEntry, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildProjectBudgetSummary } from '@/domain/crm/budget';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';

export type BuildCoreWorkflowTaskMemberVisibilityInput = {
  readonly viewerUserId: string;
  readonly onlyAssignedUserCanView: boolean;
  readonly memberRoleUserIds: readonly string[];
  /**
   * When true, include payment milestones assigned to `viewerUserId`.
   * Controlled by Payment Permissions View — not the workflow task visibility toggle.
   */
  readonly includePaymentsAssignedToViewer?: boolean;
  /**
   * When true, include all budget entries for the project.
   * Controlled by Budget Permissions View — not the workflow task visibility toggle.
   */
  readonly includeBudgetForViewer?: boolean;
};

/** Fallback when an org has no saved visibility row: members see only self-assigned tasks. */
export const DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW = true;

function memberAssigneeIdFromRef(assignee: { readonly id: string } | null | undefined): string | null {
  const assigneeId = assignee?.id?.trim();
  if (!assigneeId || isWorkflowTaskContactAssigneeId(assigneeId)) return null;
  return assigneeId;
}

function memberAssigneeId(task: CrmWorkflowTask): string | null {
  return memberAssigneeIdFromRef(task.assignedTo);
}

/** Operational workflow tasks — uses workflow task member visibility settings. */
export function isOpsWorkflowTaskVisibleToBuildCoreMember(
  task: CrmWorkflowTask,
  input: BuildCoreWorkflowTaskMemberVisibilityInput
): boolean {
  if (isPaymentWorkflowTask(task)) return false;

  const assigneeId = memberAssigneeId(task);
  if (assigneeId == null) return false;

  if (input.onlyAssignedUserCanView) {
    return assigneeId === input.viewerUserId;
  }

  const memberIds = new Set(input.memberRoleUserIds);
  return memberIds.has(assigneeId);
}

/** Payment milestones — only self-assigned rows; ignores workflow task visibility toggle. */
export function isPaymentWorkflowTaskVisibleToBuildCoreMember(
  task: CrmWorkflowTask,
  input: Pick<BuildCoreWorkflowTaskMemberVisibilityInput, 'viewerUserId'>
): boolean {
  if (!isPaymentWorkflowTask(task)) return false;

  const assigneeId = memberAssigneeId(task);
  if (assigneeId == null) return false;

  return assigneeId === input.viewerUserId;
}

/** Budget — all rows or none; controlled by Budget Permissions View only. */
export function filterBudgetEntriesForBuildCoreMember(
  entries: readonly CrmBudgetEntry[],
  input: Pick<BuildCoreWorkflowTaskMemberVisibilityInput, 'includeBudgetForViewer'>
): CrmBudgetEntry[] {
  if (input.includeBudgetForViewer !== true) return [];
  return [...entries];
}

/** @deprecated Prefer {@link isOpsWorkflowTaskVisibleToBuildCoreMember}. */
export function isWorkflowTaskVisibleToBuildCoreMember(
  task: CrmWorkflowTask,
  input: BuildCoreWorkflowTaskMemberVisibilityInput
): boolean {
  return isOpsWorkflowTaskVisibleToBuildCoreMember(task, input);
}

export function filterWorkflowTasksForBuildCoreMember(
  tasks: readonly CrmWorkflowTask[],
  input: BuildCoreWorkflowTaskMemberVisibilityInput
): CrmWorkflowTask[] {
  const includePayments = input.includePaymentsAssignedToViewer === true;

  return tasks.filter((task) => {
    if (isPaymentWorkflowTask(task)) {
      return includePayments && isPaymentWorkflowTaskVisibleToBuildCoreMember(task, input);
    }
    return isOpsWorkflowTaskVisibleToBuildCoreMember(task, input);
  });
}

/** Strip financial / admin sections from a project detail payload for member viewers. */
export function applyBuildCoreMemberProjectDetailView(
  project: CrmProjectDetail,
  visibleTasks: readonly CrmWorkflowTask[],
  visibleBudgetEntries: readonly CrmBudgetEntry[] = []
): CrmProjectDetail {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
  const visibleBudgetEntryIds = new Set(visibleBudgetEntries.map((entry) => entry.id));
  const budget = buildProjectBudgetSummary(visibleBudgetEntries);

  return {
    ...project,
    workflowTasks: [...visibleTasks],
    documents: project.documents.filter((doc) => {
      if (doc.workflowTaskId != null && visibleTaskIds.has(doc.workflowTaskId)) return true;
      if (doc.budgetEntryId != null && visibleBudgetEntryIds.has(doc.budgetEntryId)) return true;
      return false;
    }),
    accountabilityLog: [],
    milestonePayment: {
      ...project.milestonePayment,
      milestones: [],
    },
    budget,
  };
}
