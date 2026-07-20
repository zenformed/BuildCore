/**
 * Mock/demo My Tasks list — same visibility helpers as the API path.
 */

import {
  DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
  DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import { isCrmProjectInactive } from '@/domain/crm';
import type { CrmProjectSummary } from '@/domain/crm/project';
import type { CrmWorkflowTask } from '@/domain/crm/workflowTask';
import {
  crmMyTaskAssignmentKindFromTask,
  filterCrmMyTasksByAssigneeScope,
  isCrmMyTaskAssigneeFilterAvailable,
  type CrmMyTaskAssigneeScope,
  type CrmMyTaskAssignment,
  type CrmMyTasksResponse,
} from '@/domain/crm/myTaskAssignment';
import {
  getEffectiveMockProjectDetailById,
  listEffectiveMockProjectSummaries,
} from '@/infrastructure/crm/mock/mockCrmMutationStore';
import { getSession } from '@/infrastructure/supabase/supabaseClient';

function resolveParentAndSubproject(
  project: CrmProjectSummary,
  projectById: ReadonlyMap<string, CrmProjectSummary>
) {
  if (project.parentProjectId == null) {
    return {
      parentProjectId: project.id,
      parentProjectSlug: project.slug,
      parentProjectName: project.name,
      subprojectId: null as string | null,
      subprojectSlug: null as string | null,
      subprojectName: null as string | null,
    };
  }
  const parent = projectById.get(project.parentProjectId);
  return {
    parentProjectId: parent?.id ?? project.parentProjectId,
    parentProjectSlug: parent?.slug ?? '',
    parentProjectName: parent?.name ?? 'Project',
    subprojectId: project.id,
    subprojectSlug: project.slug,
    subprojectName: project.name,
  };
}

function toAssignment(
  task: CrmWorkflowTask,
  project: CrmProjectSummary,
  projectById: ReadonlyMap<string, CrmProjectSummary>
): CrmMyTaskAssignment {
  const parent = resolveParentAndSubproject(project, projectById);
  const detail = getEffectiveMockProjectDetailById(project.id);
  const documents =
    detail?.documents.filter((doc) => doc.workflowTaskId === task.id) ?? [];
  return {
    kind: crmMyTaskAssignmentKindFromTask(task),
    taskId: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    dueAt: task.dueAt,
    stageSlug: task.stageSlug,
    documentsRequired: task.documentsRequired,
    amountCents: task.amountCents,
    invoicedAt: task.invoicedAt,
    paidAt: task.paidAt,
    assignedTo: task.assignedTo,
    parentProjectId: parent.parentProjectId,
    parentProjectSlug: parent.parentProjectSlug,
    parentProjectName: parent.parentProjectName,
    subprojectId: parent.subprojectId,
    subprojectSlug: parent.subprojectSlug,
    subprojectName: parent.subprojectName,
    projectId: project.id,
    projectSlug: project.slug,
    contact: project.contact,
    clientName: project.client.name,
    address: project.address,
    projectInactive: isCrmProjectInactive(project),
    documents,
  };
}

export async function listMockCrmMyTasks(
  assigneeScope: CrmMyTaskAssigneeScope
): Promise<CrmMyTasksResponse> {
  const session = await getSession();
  const viewerUserId = session?.user?.id?.trim() || 'demo-member';

  const onlyAssignedUserCanView = DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW;
  const onlyAssignedUserCanViewPayments = DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW;
  const filterMeta = {
    onlyAssignedUserCanView,
    onlyAssignedUserCanViewPayments,
    available: isCrmMyTaskAssigneeFilterAvailable({
      onlyAssignedUserCanView,
      onlyAssignedUserCanViewPayments,
    }),
  };

  const projects = listEffectiveMockProjectSummaries({ rootsOnly: false });
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const mapped: { task: CrmWorkflowTask; projectId: string }[] = [];
  for (const project of projects) {
    const detail = getEffectiveMockProjectDetailById(project.id);
    if (detail == null) continue;
    for (const task of detail.workflowTasks) {
      mapped.push({ task, projectId: project.id });
    }
  }

  const visible = filterWorkflowTasksForBuildCoreMember(
    mapped.map((entry) => entry.task),
    {
      viewerUserId,
      onlyAssignedUserCanView,
      onlyAssignedUserCanViewPayments,
      memberRoleUserIds: [viewerUserId],
      includePaymentsAssignedToViewer: true,
      includeBudgetForViewer: false,
    }
  );
  const visibleIds = new Set(visible.map((task) => task.id));
  const assignments = mapped
    .filter((entry) => visibleIds.has(entry.task.id))
    .map((entry) => toAssignment(entry.task, projectById.get(entry.projectId)!, projectById));

  const scoped = filterMeta.available
    ? filterCrmMyTasksByAssigneeScope(assignments, assigneeScope, viewerUserId)
    : filterCrmMyTasksByAssigneeScope(assignments, 'mine', viewerUserId);

  return {
    tasks: scoped,
    assigneeFilter: filterMeta,
    viewerUserId,
  };
}
