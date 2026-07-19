/**
 * Member My Tasks dashboard assignment DTO and pure helpers.
 * Groups workflow + payment assignments by parent project.
 */

import type { CrmContact } from './contact';
import type { CrmDocumentMetadata } from './document';
import type { CrmProjectAddress } from './projectAddress';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';
import type { WorkflowTaskStatus } from './workflowTask';
import { isPaymentWorkflowTask } from './paymentWorkflow';
import { isWorkflowTaskContactAssigneeId } from './workflowTaskAssignee';

export type CrmMyTaskAssignmentKind = 'workflow' | 'payment';

/** Query / filter scope for Members who can see other Members' assignments. */
export type CrmMyTaskAssigneeScope = 'mine' | 'others' | 'everyone';

export type CrmMyTaskAssignment = {
  readonly kind: CrmMyTaskAssignmentKind;
  readonly taskId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly status: WorkflowTaskStatus;
  readonly dueAt: string | null;
  readonly stageSlug: PipelineStageSlug;
  readonly documentsRequired: boolean;
  readonly amountCents: number | null;
  readonly invoicedAt: string | null;
  readonly paidAt: string | null;
  readonly assignedTo: CrmTeamMemberRef | null;
  /** Parent (root) project used for grouping. */
  readonly parentProjectId: string;
  readonly parentProjectSlug: string;
  readonly parentProjectName: string;
  /** Set when the assignment lives on a subproject. */
  readonly subprojectId: string | null;
  readonly subprojectSlug: string | null;
  readonly subprojectName: string | null;
  /** Owning project id/slug (subproject when present, else parent). */
  readonly projectId: string;
  readonly projectSlug: string;
  readonly contact: CrmContact;
  readonly clientName: string;
  readonly address: CrmProjectAddress;
  /** True when the owning project/subproject is inactive. */
  readonly projectInactive: boolean;
  readonly documents: readonly CrmDocumentMetadata[];
};

export type CrmMyTaskAssigneeFilterMeta = {
  /** When false, UI must not show an assignee filter. */
  readonly available: boolean;
  readonly onlyAssignedUserCanView: boolean;
  readonly onlyAssignedUserCanViewPayments: boolean;
};

export type CrmMyTasksResponse = {
  readonly tasks: readonly CrmMyTaskAssignment[];
  readonly assigneeFilter: CrmMyTaskAssigneeFilterMeta;
  readonly viewerUserId: string;
};

export type CrmMyTaskParentGroup = {
  readonly parentProjectId: string;
  readonly parentProjectSlug: string;
  readonly parentProjectName: string;
  readonly tasks: readonly CrmMyTaskAssignment[];
};

export function crmMyTaskAssignmentKindFromTask(
  task: Pick<{ amountCents: number | null }, 'amountCents'>
): CrmMyTaskAssignmentKind {
  return isPaymentWorkflowTask(task) ? 'payment' : 'workflow';
}

/** Second-line context: `Project - Estimate Submitted` / `Subproject - Payment`. */
export function formatCrmMyTaskContextLine(
  task: Pick<CrmMyTaskAssignment, 'kind' | 'subprojectId' | 'subprojectName'>,
  options: {
    readonly projectLabel: string;
    readonly subprojectLabel: string;
    readonly paymentLabel: string;
    readonly stageLabel: string;
  }
): string {
  const isSubproject =
    task.subprojectId != null ||
    (task.subprojectName != null && task.subprojectName.trim() !== '');
  const location = isSubproject ? options.subprojectLabel : options.projectLabel;
  const trailing = task.kind === 'payment' ? options.paymentLabel : options.stageLabel;
  return `${location} - ${trailing}`;
}

export function memberAssigneeIdFromMyTask(
  task: Pick<CrmMyTaskAssignment, 'assignedTo'>
): string | null {
  const id = task.assignedTo?.id?.trim();
  if (!id || isWorkflowTaskContactAssigneeId(id)) return null;
  return id;
}

export function filterCrmMyTasksByAssigneeScope(
  tasks: readonly CrmMyTaskAssignment[],
  scope: CrmMyTaskAssigneeScope,
  viewerUserId: string
): CrmMyTaskAssignment[] {
  const viewer = viewerUserId.trim();
  if (scope === 'everyone') return [...tasks];
  if (scope === 'mine') {
    return tasks.filter((task) => memberAssigneeIdFromMyTask(task) === viewer);
  }
  return tasks.filter((task) => {
    const assigneeId = memberAssigneeIdFromMyTask(task);
    return assigneeId != null && assigneeId !== viewer;
  });
}

export function isCrmMyTaskAssigneeFilterAvailable(
  meta: Pick<
    CrmMyTaskAssigneeFilterMeta,
    'onlyAssignedUserCanView' | 'onlyAssignedUserCanViewPayments'
  >
): boolean {
  return !meta.onlyAssignedUserCanView || !meta.onlyAssignedUserCanViewPayments;
}

/** Group by parent project; omit empty groups; stable name sort. */
export function groupCrmMyTasksByParentProject(
  tasks: readonly CrmMyTaskAssignment[]
): CrmMyTaskParentGroup[] {
  const byParent = new Map<string, CrmMyTaskParentGroup>();

  for (const task of tasks) {
    const existing = byParent.get(task.parentProjectId);
    if (existing != null) {
      byParent.set(task.parentProjectId, {
        ...existing,
        tasks: [...existing.tasks, task],
      });
      continue;
    }
    byParent.set(task.parentProjectId, {
      parentProjectId: task.parentProjectId,
      parentProjectSlug: task.parentProjectSlug,
      parentProjectName: task.parentProjectName,
      tasks: [task],
    });
  }

  return [...byParent.values()]
    .filter((group) => group.tasks.length > 0)
    .sort((a, b) =>
      a.parentProjectName.localeCompare(b.parentProjectName, undefined, { sensitivity: 'base' })
    );
}

export function parseCrmMyTaskAssigneeScope(
  value: string | null | undefined
): CrmMyTaskAssigneeScope {
  if (value === 'others' || value === 'everyone' || value === 'mine') return value;
  return 'mine';
}
