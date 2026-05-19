import type {

  ICrmAccountabilityRepository,

  ICrmDocumentsRepository,

  ICrmMilestonePaymentsRepository,

  ICrmProjectDetailRepository,

  ICrmProjectsRepository,

  ICrmWorkflowTasksRepository,

} from '@/application/ports/crm';

import type {

  CreateCrmProjectInput,

  CreateCrmProjectResult,

  CreateCrmWorkflowTaskInput,

  CrmAccountabilityAction,

  CrmDocumentMetadata,

  CrmMilestonePaymentSummary,

  CrmProjectDetail,

  CrmProjectSummary,

  CrmWorkflowTask,

  UpdateCrmProjectInput,

  UpdateCrmWorkflowTaskInput,

} from '@/domain/crm';

import { getMockCrmTeamMember } from '@/platform/mock/crm';

import { MOCK_CRM_PROJECT_SUMMARIES } from '@/platform/mock/crm';

import { CrmWriteNotAvailableError } from '@/infrastructure/crm/errors';
import { getDocumentStorageProvider } from '@/infrastructure/storage/getDocumentStorageProvider';
import {
  mockAssertWorkflowTaskCanBeMarkedDone,
  mockCreateWorkflowTaskDocumentDownload,
  mockDeleteWorkflowTaskDocument,
  mockListWorkflowTaskDocuments,
  mockUploadWorkflowTaskDocument,
} from './mockCrmDocumentMutations';

import {

  getEffectiveMockProjectDetailById,

  getEffectiveMockProjectDetailBySlug,

  saveMockProjectDetail,

} from './mockCrmMutationStore';

function notesPreview(notes: string | null, max = 120): string | null {

  if (notes == null) return null;

  const trimmed = notes.trim();

  if (!trimmed) return null;

  if (trimmed.length <= max) return trimmed;

  return `${trimmed.slice(0, max - 1)}…`;

}



function applyProjectUpdate(detail: CrmProjectDetail, input: UpdateCrmProjectInput): CrmProjectDetail {

  const assignedTo =

    input.assignedMemberId != null ? getMockCrmTeamMember(input.assignedMemberId) : null;

  const now = new Date().toISOString();

  const summary: CrmProjectSummary = {

    ...detail.summary,

    name: input.name,

    tradeType: input.tradeType,

    contact: {

      ...detail.summary.contact,

      name: input.contactName,

      email: input.email,

      phone: input.phone,

    },

    client: { ...detail.summary.client, name: input.name },

    priority: input.priority,

    currentStageSlug: input.currentStageSlug,

    waitingOn: input.waitingOn,

    notesPreview: notesPreview(input.notes),

    dealValueCents: input.dealValueCents,

    balanceRemainingCents: input.balanceRemainingCents,

    assignedTo,

    lastUpdatedAt: now,

  };

  const accountability: CrmAccountabilityAction = {

    id: `acct-mock-${Date.now()}`,

    at: now,

    actor: assignedTo ?? getMockCrmTeamMember('tm-alex'),

    action: `Updated project ${input.name}`,

    stageSlug: input.currentStageSlug,

  };

  return saveAndReturn(detail.summary.slug, {

    ...detail,

    summary,

    notes: input.notes,

    accountabilityLog: [accountability, ...detail.accountabilityLog],

  });

}



function saveAndReturn(slug: string, detail: CrmProjectDetail): CrmProjectDetail {

  saveMockProjectDetail(slug, detail);

  return getEffectiveMockProjectDetailBySlug(slug)!;

}



export class MockCrmProjectsRepository implements ICrmProjectsRepository {

  listSummaries(): readonly CrmProjectSummary[] {

    return MOCK_CRM_PROJECT_SUMMARIES;

  }



  create(_input: CreateCrmProjectInput): Promise<CreateCrmProjectResult> {

    return Promise.reject(new CrmWriteNotAvailableError());

  }

}



export class MockCrmProjectDetailRepository implements ICrmProjectDetailRepository {

  getBySlug(slug: string): CrmProjectDetail | null {

    return getEffectiveMockProjectDetailBySlug(slug);

  }



  getById(id: string): CrmProjectDetail | null {

    return getEffectiveMockProjectDetailById(id);

  }



  updateBySlug(slug: string, input: UpdateCrmProjectInput): CrmProjectDetail | null {

    const detail = getEffectiveMockProjectDetailBySlug(slug);

    if (detail == null) return null;

    return applyProjectUpdate(detail, input);

  }

}



function requireProjectDetail(projectId: string): CrmProjectDetail | null {

  return getEffectiveMockProjectDetailById(projectId);

}



export class MockCrmWorkflowTasksRepository implements ICrmWorkflowTasksRepository {

  listByProjectId(projectId: string): readonly CrmWorkflowTask[] {

    return requireProjectDetail(projectId)?.workflowTasks ?? [];

  }



  create(input: CreateCrmWorkflowTaskInput): CrmWorkflowTask {

    const detail = requireProjectDetail(input.projectId);

    if (detail == null) throw new Error('Project not found');

    const assignee =

      input.assignedMemberId != null ? getMockCrmTeamMember(input.assignedMemberId) : null;

    const task: CrmWorkflowTask = {

      id: `wf-mock-${Date.now()}`,

      title: input.title,

      stageSlug: input.stageSlug,

      status: input.status,

      documentsRequired: input.documentsRequired,

      notes: input.notes,

      assignedTo: assignee,

      dueAt: input.dueAt,

      completedAt: input.status === 'done' ? new Date().toISOString() : null,

      completedBy: input.status === 'done' ? assignee : null,

      sortOrder: detail.workflowTasks.length + 1,

      amountCents: input.amountCents ?? null,

    };

    saveAndReturn(detail.summary.slug, {

      ...detail,

      workflowTasks: [...detail.workflowTasks, task],

    });

    return task;

  }



  update(input: UpdateCrmWorkflowTaskInput): CrmWorkflowTask | null {
    let found: { slug: string; detail: CrmProjectDetail; task: CrmWorkflowTask } | null = null;
    for (const summary of MOCK_CRM_PROJECT_SUMMARIES) {
      const slug = summary.slug;

      const d = getEffectiveMockProjectDetailBySlug(slug);

      if (!d) continue;

      const task = d.workflowTasks.find((t) => t.id === input.taskId);

      if (task) {

        found = { slug, detail: d, task };

        break;

      }

    }

    if (found == null) return null;

    const nextStatus = input.status ?? found.task.status;
    const nextDocumentsRequired =
      input.documentsRequired ?? found.task.documentsRequired;
    if (nextStatus === 'done' && found.task.status !== 'done') {
      mockAssertWorkflowTaskCanBeMarkedDone(found.detail, {
        ...found.task,
        documentsRequired: nextDocumentsRequired,
      });
    }

    const next: CrmWorkflowTask = {

      ...found.task,

      title: input.title ?? found.task.title,

      stageSlug: input.stageSlug ?? found.task.stageSlug,

      status: input.status ?? found.task.status,

      documentsRequired: input.documentsRequired ?? found.task.documentsRequired,

      notes: input.notes !== undefined ? input.notes : found.task.notes,

      assignedTo:

        input.assignedMemberId !== undefined

          ? input.assignedMemberId

            ? getMockCrmTeamMember(input.assignedMemberId)

            : null

          : found.task.assignedTo,

      dueAt: input.dueAt !== undefined ? input.dueAt : found.task.dueAt,

      completedAt:

        (input.status ?? found.task.status) === 'done'

          ? found.task.completedAt ?? new Date().toISOString()

          : null,

      completedBy:

        (input.status ?? found.task.status) === 'done'

          ? found.task.completedBy ?? found.task.assignedTo

          : null,

      amountCents:

        input.amountCents !== undefined ? input.amountCents : found.task.amountCents,

    };



    const tasks = found.detail.workflowTasks.map((t) => (t.id === input.taskId ? next : t));

    saveAndReturn(found.slug, { ...found.detail, workflowTasks: tasks });

    return next;

  }



  archive(taskId: string): boolean {

    for (const summary of MOCK_CRM_PROJECT_SUMMARIES) {

      const detail = getEffectiveMockProjectDetailBySlug(summary.slug);

      if (detail == null) continue;

      if (!detail.workflowTasks.some((t) => t.id === taskId)) continue;

      const tasks = detail.workflowTasks.filter((t) => t.id !== taskId);

      saveAndReturn(summary.slug, { ...detail, workflowTasks: tasks });

      return true;

    }

    return false;

  }

}



const MOCK_ORG_ID = 'mock-org';

export class MockCrmDocumentsRepository implements ICrmDocumentsRepository {

  listByProjectId(projectId: string): readonly CrmDocumentMetadata[] {

    return requireProjectDetail(projectId)?.documents ?? [];

  }

  listByWorkflowTaskId(input: {
    projectSlug: string;
    workflowTaskId: string;
  }): readonly CrmDocumentMetadata[] {
    return mockListWorkflowTaskDocuments(input);
  }

  upload(input: import('@/domain/crm/documentMutations').UploadWorkflowTaskDocumentInput): Promise<{
    document: CrmDocumentMetadata;
  }> {
    return mockUploadWorkflowTaskDocument(
      getDocumentStorageProvider(),
      MOCK_ORG_ID,
      'mock-user',
      input
    ).then((document) => ({ document }));
  }

  delete(
    input: import('@/domain/crm/documentMutations').DeleteWorkflowTaskDocumentInput
  ): Promise<void> {
    return mockDeleteWorkflowTaskDocument(
      getDocumentStorageProvider(),
      MOCK_ORG_ID,
      input
    );
  }

  createDownload(
    input: import('@/domain/crm/documentMutations').CreateWorkflowTaskDocumentDownloadInput
  ): Promise<import('@/domain/crm/documentMutations').WorkflowTaskDocumentDownload> {
    return mockCreateWorkflowTaskDocumentDownload(
      getDocumentStorageProvider(),
      MOCK_ORG_ID,
      input
    );
  }

}



export class MockCrmMilestonePaymentsRepository implements ICrmMilestonePaymentsRepository {

  getByProjectId(projectId: string): CrmMilestonePaymentSummary | null {

    return requireProjectDetail(projectId)?.milestonePayment ?? null;

  }

}



export class MockCrmAccountabilityRepository implements ICrmAccountabilityRepository {

  listByProjectId(projectId: string): readonly CrmAccountabilityAction[] {

    return requireProjectDetail(projectId)?.accountabilityLog ?? [];

  }

}


