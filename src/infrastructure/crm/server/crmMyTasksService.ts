/**
 * Org-wide Member My Tasks list for GET /api/crm/my-tasks.
 * Reuses member visibility + payment permission helpers (no duplicated rules).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  filterWorkflowTasksForBuildCoreMember,
  type BuildCoreWorkflowTaskMemberVisibilityInput,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import { isCrmProjectInactive } from '@/domain/crm';
import type { CrmContact } from '@/domain/crm/contact';
import type { CrmDocumentMetadata } from '@/domain/crm/document';
import type { CrmProjectSummary } from '@/domain/crm/project';
import type { PipelineStageSlug } from '@/domain/crm/pipelineStage';
import type { CrmWorkflowTask } from '@/domain/crm/workflowTask';
import {
  crmMyTaskAssignmentKindFromTask,
  filterCrmMyTasksByAssigneeScope,
  isCrmMyTaskAssigneeFilterAvailable,
  parseCrmMyTaskAssigneeScope,
  type CrmMyTaskAssigneeScope,
  type CrmMyTaskAssignment,
  type CrmMyTasksResponse,
} from '@/domain/crm/myTaskAssignment';
import {
  mapDbDocument,
  mapDbWorkflowTask,
  type DbCrmDocumentRow,
  type DbCrmWorkflowTaskRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmMemberMap } from './crmMemberMap';
import { listCrmProjectSummariesForOrg } from './crmReadService';
import { resolveBuildCoreMemberTaskVisibilityInput } from './buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

const TASK_SELECT =
  'id, project_id, title, stage_slug, status, documents_required, notes, due_at, completed_at, assigned_member_id, assigned_contact_id, assigned_at, completed_by_member_id, sort_order, amount_cents, invoiced_at, paid_at';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, deleted_at, latitude, longitude, location_accuracy_meters, location_source, location_captured_at';

export class CrmMyTasksForbiddenError extends Error {
  constructor(message = 'Only members can access My Tasks.') {
    super(message);
    this.name = 'CrmMyTasksForbiddenError';
  }
}

function resolveParentAndSubproject(
  project: CrmProjectSummary,
  projectById: ReadonlyMap<string, CrmProjectSummary>
): {
  parentProjectId: string;
  parentProjectSlug: string;
  parentProjectName: string;
  subprojectId: string | null;
  subprojectSlug: string | null;
  subprojectName: string | null;
} {
  if (project.parentProjectId == null) {
    return {
      parentProjectId: project.id,
      parentProjectSlug: project.slug,
      parentProjectName: project.name,
      subprojectId: null,
      subprojectSlug: null,
      subprojectName: null,
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

function toMyTaskAssignment(
  task: CrmWorkflowTask,
  project: CrmProjectSummary,
  projectById: ReadonlyMap<string, CrmProjectSummary>,
  documents: readonly CrmDocumentMetadata[]
): CrmMyTaskAssignment {
  const parent = resolveParentAndSubproject(project, projectById);
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
    latitude: project.latitude,
    longitude: project.longitude,
    projectInactive: isCrmProjectInactive(project),
    documents,
  };
}

async function listOrgWorkflowTaskRows(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly DbCrmWorkflowTaskRow[]> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select(TASK_SELECT)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbCrmWorkflowTaskRow[] | null) ?? [];
}

async function listDocumentsByTaskIds(
  supabase: SupabaseClient,
  organizationId: string,
  taskIds: readonly string[],
  stageSlugByTaskId: ReadonlyMap<string, PipelineStageSlug>
): Promise<Map<string, CrmDocumentMetadata[]>> {
  const byTaskId = new Map<string, CrmDocumentMetadata[]>();
  if (taskIds.length === 0) return byTaskId;

  const { data, error } = await supabase
    .from('crm_documents')
    .select(DOCUMENT_SELECT)
    .eq('organization_id', organizationId)
    .in('workflow_task_id', [...taskIds])
    .is('deleted_at', null)
    .eq('upload_status', 'ready');
  if (error) throw new Error(error.message);

  const rows = (data as DbCrmDocumentRow[] | null) ?? [];
  const memberIds = rows.flatMap((row) =>
    [row.uploaded_by_member_id, row.reviewed_by_member_id].filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    )
  );
  const memberById = await loadCrmMemberMap(supabase, memberIds, { organizationId });

  for (const row of rows) {
    const taskId = row.workflow_task_id;
    if (taskId == null) continue;
    const doc = mapDbDocument(row, stageSlugByTaskId, memberById);
    const list = byTaskId.get(taskId) ?? [];
    list.push(doc);
    byTaskId.set(taskId, list);
  }
  return byTaskId;
}

function applyAssigneeScopeOnServer(
  tasks: readonly CrmMyTaskAssignment[],
  scope: CrmMyTaskAssigneeScope,
  viewerUserId: string,
  filterAvailable: boolean
): CrmMyTaskAssignment[] {
  if (!filterAvailable) {
    return filterCrmMyTasksByAssigneeScope(tasks, 'mine', viewerUserId);
  }
  return filterCrmMyTasksByAssigneeScope(tasks, scope, viewerUserId);
}

export async function listCrmMyTasksForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  options?: { readonly assigneeScope?: string | null }
): Promise<CrmMyTasksResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    throw new CrmMyTasksForbiddenError();
  }

  const assigneeScope = parseCrmMyTaskAssigneeScope(options?.assigneeScope);

  const [visibilityInput, paymentAccess, projects, taskRows] = await Promise.all([
    resolveBuildCoreMemberTaskVisibilityInput(supabase, organizationId, userId),
    resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
    listCrmProjectSummariesForOrg(supabase, organizationId, { rootsOnly: false }),
    listOrgWorkflowTaskRows(supabase, organizationId),
  ]);

  const scopeInput: BuildCoreWorkflowTaskMemberVisibilityInput = {
    ...visibilityInput,
    includePaymentsAssignedToViewer: paymentAccess.canView,
    includeBudgetForViewer: false,
  };

  const filterMetaBase = {
    onlyAssignedUserCanView: visibilityInput.onlyAssignedUserCanView,
    onlyAssignedUserCanViewPayments:
      visibilityInput.onlyAssignedUserCanViewPayments ?? visibilityInput.onlyAssignedUserCanView,
  };
  const filterMeta = {
    ...filterMetaBase,
    available: isCrmMyTaskAssigneeFilterAvailable(filterMetaBase),
  };

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const contactById = new Map<string, CrmContact>();
  for (const project of projects) {
    contactById.set(project.contact.id, project.contact);
  }

  const memberIds = taskRows.flatMap((row) =>
    [row.assigned_member_id, row.completed_by_member_id].filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    )
  );
  const memberById = await loadCrmMemberMap(supabase, memberIds, { organizationId });

  const mappedTasks: { task: CrmWorkflowTask; projectId: string }[] = [];
  for (const row of taskRows) {
    if (!projectById.has(row.project_id)) continue;
    mappedTasks.push({
      task: mapDbWorkflowTask(row, memberById, contactById),
      projectId: row.project_id,
    });
  }

  const visibleTasks = filterWorkflowTasksForBuildCoreMember(
    mappedTasks.map((entry) => entry.task),
    scopeInput
  );
  const visibleIdSet = new Set(visibleTasks.map((task) => task.id));
  const visibleMapped = mappedTasks.filter((entry) => visibleIdSet.has(entry.task.id));

  const stageSlugByTaskId = new Map(
    visibleMapped.map((entry) => [entry.task.id, entry.task.stageSlug])
  );
  const documentsByTaskId = await listDocumentsByTaskIds(
    supabase,
    organizationId,
    visibleMapped.map((entry) => entry.task.id),
    stageSlugByTaskId
  );

  const assignments = visibleMapped.map((entry) => {
    const project = projectById.get(entry.projectId)!;
    return toMyTaskAssignment(
      entry.task,
      project,
      projectById,
      documentsByTaskId.get(entry.task.id) ?? []
    );
  });

  const scoped = applyAssigneeScopeOnServer(
    assignments,
    assigneeScope,
    userId,
    filterMeta.available
  );

  scoped.sort((a, b) => {
    const parentCmp = a.parentProjectName.localeCompare(b.parentProjectName, undefined, {
      sensitivity: 'base',
    });
    if (parentCmp !== 0) return parentCmp;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  return {
    tasks: scoped,
    assigneeFilter: filterMeta,
    viewerUserId: userId,
  };
}

export async function getCrmMyTaskForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  taskId: string
): Promise<CrmMyTaskAssignment | null> {
  const result = await listCrmMyTasksForViewer(supabase, organizationId, userId, {
    assigneeScope: 'everyone',
  });
  return result.tasks.find((task) => task.taskId === taskId) ?? null;
}
