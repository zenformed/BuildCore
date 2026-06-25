import type { CrmProjectDetail } from '@/domain/crm';
import { isCrmProjectInactive, isPaymentWorkflowTask } from '@/domain/crm';
import {
  computeBalanceDueFromPayments,
  computeProjectValueFromPayments,
} from '@/domain/crm/projectPaymentValue';

/** Parent (top-level) project that is open and not marked inactive. */
export function isReportsActiveParentProject(project: CrmProjectDetail): boolean {
  const { summary } = project;
  if (summary.parentProjectId != null) return false;
  if (summary.completedAt != null) return false;
  if (isCrmProjectInactive(summary)) return false;
  return true;
}

export function partitionCrmProjectsForReports(projects: readonly CrmProjectDetail[]): {
  roots: CrmProjectDetail[];
  childrenByParentId: Map<string, CrmProjectDetail[]>;
} {
  const roots: CrmProjectDetail[] = [];
  const childrenByParentId = new Map<string, CrmProjectDetail[]>();

  for (const project of projects) {
    if (project.summary.parentProjectId == null) {
      roots.push(project);
      continue;
    }
    const siblings = childrenByParentId.get(project.summary.parentProjectId) ?? [];
    siblings.push(project);
    childrenByParentId.set(project.summary.parentProjectId, siblings);
  }

  return { roots, childrenByParentId };
}

export function countReportsActiveParentProjects(projects: readonly CrmProjectDetail[]): number {
  return projects.filter(isReportsActiveParentProject).length;
}

export function computeReportsActiveParentMetrics(projects: readonly CrmProjectDetail[]): {
  count: number;
  waitingApprovalCount: number;
  overdueProjectCount: number;
  pipelineCents: number;
  unpaidCents: number;
} {
  const now = Date.now();
  const { roots, childrenByParentId } = partitionCrmProjectsForReports(projects);
  const activeParents = roots.filter(isReportsActiveParentProject);

  let waitingApprovalCount = 0;
  let overdueProjectCount = 0;
  let pipelineCents = 0;
  let unpaidCents = 0;

  for (const parent of activeParents) {
    if (parent.summary.currentStageSlug === 'waiting-on-approval') {
      waitingApprovalCount += 1;
    }

    const parentPayments = parent.workflowTasks.filter(isPaymentWorkflowTask);
    const childPayments = (childrenByParentId.get(parent.summary.id) ?? []).flatMap((child) =>
      child.workflowTasks.filter(isPaymentWorkflowTask)
    );
    const allPayments = [...parentPayments, ...childPayments];

    pipelineCents += computeProjectValueFromPayments(allPayments);
    unpaidCents += computeBalanceDueFromPayments(allPayments);

    const hasOverdue = allPayments.some((task) => {
      if (task.invoicedAt == null || task.paidAt != null || task.dueAt == null) return false;
      const dueMs = new Date(task.dueAt).getTime();
      return !Number.isNaN(dueMs) && dueMs < now;
    });
    if (hasOverdue) overdueProjectCount += 1;
  }

  return {
    count: activeParents.length,
    waitingApprovalCount,
    overdueProjectCount,
    pipelineCents,
    unpaidCents,
  };
}
