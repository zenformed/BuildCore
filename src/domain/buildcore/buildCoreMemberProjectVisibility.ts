import type { CrmClient } from '@/domain/crm/client';
import type { CrmContact } from '@/domain/crm/contact';
import { maskEmailForMemberDisplay } from '@/domain/buildcore/maskEmailForMemberDisplay';
import { emptyCrmProjectAddress, type CrmProjectAddress } from '@/domain/crm/projectAddress';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm/project';
import type { BuildCoreWorkflowTaskMemberVisibilityInput } from '@/domain/buildcore/workflowTaskMemberVisibility';
import { DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW } from '@/domain/buildcore/workflowTaskMemberVisibility';
import { isBuildCoreMemberAssigneeVisibleToViewer } from '@/domain/buildcore/buildCoreMemberAssigneeVisibility';

const REDACTED_CONTACT: CrmContact = {
  id: 'redacted',
  name: '—',
  email: '',
  phone: '',
  emails: [],
  phones: [],
  title: null,
};

const REDACTED_CLIENT: CrmClient = {
  id: 'redacted',
  name: '—',
  segment: null,
};

const REDACTED_ADDRESS: CrmProjectAddress = emptyCrmProjectAddress();

export type MemberProjectVisibilityTaskRef = {
  readonly projectId: string;
  readonly assignedMemberId: string | null;
  readonly assignedContactId: string | null;
  readonly amountCents: number | null;
};

export type BuildCoreMemberProjectVisibilityScope = {
  readonly directProjectIds: ReadonlySet<string>;
  readonly parentContainerProjectIds: ReadonlySet<string>;
};

export function isMemberProjectVisibilityTaskVisible(
  task: MemberProjectVisibilityTaskRef,
  input: BuildCoreWorkflowTaskMemberVisibilityInput,
  includePaymentsAssignedToViewer: boolean
): boolean {
  if (task.assignedContactId != null) return false;
  const assigneeId = task.assignedMemberId?.trim();
  if (!assigneeId) return false;

  const isPayment = task.amountCents != null;
  if (isPayment) {
    if (!includePaymentsAssignedToViewer) return false;
    return isBuildCoreMemberAssigneeVisibleToViewer({
      assigneeMemberId: assigneeId,
      viewerUserId: input.viewerUserId,
      onlyAssignedUserCanView:
        input.onlyAssignedUserCanViewPayments ?? DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
      memberRoleUserIds: input.memberRoleUserIds,
    });
  }

  return isBuildCoreMemberAssigneeVisibleToViewer({
    assigneeMemberId: assigneeId,
    viewerUserId: input.viewerUserId,
    onlyAssignedUserCanView: input.onlyAssignedUserCanView,
    memberRoleUserIds: input.memberRoleUserIds,
  });
}

export function collectDirectProjectIdsFromMemberVisibleTasks(
  tasks: readonly MemberProjectVisibilityTaskRef[],
  input: BuildCoreWorkflowTaskMemberVisibilityInput,
  includePaymentsAssignedToViewer: boolean
): Set<string> {
  const projectIds = new Set<string>();
  for (const task of tasks) {
    if (!isMemberProjectVisibilityTaskVisible(task, input, includePaymentsAssignedToViewer)) {
      continue;
    }
    projectIds.add(task.projectId);
  }
  return projectIds;
}

export function buildMemberProjectVisibilityScope(
  directProjectIds: ReadonlySet<string>,
  parentProjectIdByChildId: ReadonlyMap<string, string | null>
): BuildCoreMemberProjectVisibilityScope {
  const parentContainerProjectIds = new Set<string>();
  for (const projectId of directProjectIds) {
    const parentId = parentProjectIdByChildId.get(projectId) ?? null;
    if (parentId != null && !directProjectIds.has(parentId)) {
      parentContainerProjectIds.add(parentId);
    }
  }
  return { directProjectIds, parentContainerProjectIds };
}

export function isProjectDirectlyVisibleToMember(
  projectId: string,
  scope: BuildCoreMemberProjectVisibilityScope
): boolean {
  return scope.directProjectIds.has(projectId);
}

export function isProjectAccessibleToMember(
  projectId: string,
  scope: BuildCoreMemberProjectVisibilityScope
): boolean {
  return scope.directProjectIds.has(projectId) || scope.parentContainerProjectIds.has(projectId);
}

export function maskProjectSummaryContactEmailForMember(
  summary: CrmProjectSummary
): CrmProjectSummary {
  const email = summary.contact.email.trim();
  if (!email) return summary;

  return {
    ...summary,
    contact: {
      ...summary.contact,
      email: maskEmailForMemberDisplay(email),
    },
  };
}

export function maskProjectDetailContactEmailForMember(
  project: CrmProjectDetail
): CrmProjectDetail {
  return {
    ...project,
    summary: maskProjectSummaryContactEmailForMember(project.summary),
  };
}

export function reduceProjectSummaryForMemberContainer(
  summary: CrmProjectSummary
): CrmProjectSummary {
  return {
    ...summary,
    contact: REDACTED_CONTACT,
    client: REDACTED_CLIENT,
    address: REDACTED_ADDRESS,
    notesPreview: null,
    dealValueCents: 0,
    balanceRemainingCents: 0,
    assignedTo: null,
    completedBy: null,
    latitude: null,
    longitude: null,
  };
}

export function scopeProjectSummariesForMember(
  summaries: readonly CrmProjectSummary[],
  scope: BuildCoreMemberProjectVisibilityScope
): CrmProjectSummary[] {
  const scoped: CrmProjectSummary[] = [];
  for (const summary of summaries) {
    if (scope.directProjectIds.has(summary.id)) {
      scoped.push(maskProjectSummaryContactEmailForMember(summary));
      continue;
    }
    if (scope.parentContainerProjectIds.has(summary.id)) {
      scoped.push(reduceProjectSummaryForMemberContainer(summary));
    }
  }
  return scoped;
}

export function applyMinimalMemberParentProjectDetailView(
  project: CrmProjectDetail
): CrmProjectDetail {
  return {
    ...project,
    summary: reduceProjectSummaryForMemberContainer(project.summary),
    notes: null,
    workflowTasks: [],
    documents: [],
    accountabilityLog: [],
    milestonePayment: {
      ...project.milestonePayment,
      milestones: [],
      balanceCents: 0,
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

export function filterProjectKeyedMapForMember<T>(
  byProjectId: ReadonlyMap<string, T>,
  scope: BuildCoreMemberProjectVisibilityScope
): Map<string, T> {
  const filtered = new Map<string, T>();
  for (const [projectId, value] of byProjectId) {
    if (scope.directProjectIds.has(projectId)) {
      filtered.set(projectId, value);
    }
  }
  return filtered;
}
