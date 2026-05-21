import type {

  ICrmAccountabilityRepository,

  ICrmBudgetRepository,

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

  CrmBudgetEntry,

  CrmDocumentMetadata,

  CrmMilestonePaymentSummary,

  CrmProjectDetail,

  CrmProjectSummary,

  CrmWorkflowTask,

  UpdateCrmProjectInput,

  UpdateCrmWorkflowTaskInput,

} from '@/domain/crm';

import { buildProjectBudgetSummary, resolvePaymentTimingFields } from '@/domain/crm';

import type {

  CreateCrmBudgetEntryInput,

  DeleteCrmBudgetEntryInput,

  UpdateCrmBudgetEntryInput,

} from '@/domain/crm/budgetMutations';

import { getMockCrmTeamMember } from '@/platform/mock/crm';

import { MOCK_CRM_PROJECT_DETAILS, MOCK_CRM_PROJECT_SUMMARIES } from '@/platform/mock/crm';

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
  mockCreateBudgetEntryDocumentDownload,
  mockDeleteBudgetEntryDocument,
  mockListBudgetEntryDocuments,
  mockUploadBudgetEntryDocument,
} from './mockCrmBudgetEntryDocumentMutations';

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
    completedAt: detail.summary.completedAt,
    completedBy: detail.summary.completedBy,

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



function applyProjectCompletion(
  detail: CrmProjectDetail,
  complete: boolean,
  actorId: string
): CrmProjectDetail {
  const now = new Date().toISOString();
  const actor = getMockCrmTeamMember(actorId);
  const summary: CrmProjectSummary = {
    ...detail.summary,
    completedAt: complete ? now : null,
    completedBy: complete ? actor : null,
    lastUpdatedAt: now,
  };
  const accountability: CrmAccountabilityAction = {
    id: `acct-mock-${Date.now()}`,
    at: now,
    actor,
    action: complete
      ? `Marked project ${detail.summary.name} as complete`
      : `Marked project ${detail.summary.name} as incomplete`,
    stageSlug: detail.summary.currentStageSlug,
  };
  return saveAndReturn(detail.summary.slug, {
    ...detail,
    summary,
    accountabilityLog: [accountability, ...detail.accountabilityLog],
  });
}



export class MockCrmProjectsRepository implements ICrmProjectsRepository {

  listSummaries(): readonly CrmProjectSummary[] {

    return MOCK_CRM_PROJECT_DETAILS.map((seed) => {
      const effective = getEffectiveMockProjectDetailBySlug(seed.summary.slug);
      return effective?.summary ?? seed.summary;
    });

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



  setCompletion(slug: string, complete: boolean): CrmProjectDetail | null {

    const detail = getEffectiveMockProjectDetailBySlug(slug);

    if (detail == null) return null;

    return applyProjectCompletion(detail, complete, 'tm-alex');

  }

}



function requireProjectDetail(projectId: string): CrmProjectDetail | null {

  return getEffectiveMockProjectDetailById(projectId);

}



export class MockCrmWorkflowTasksRepository implements ICrmWorkflowTasksRepository {

  listByProject(input: { projectId: string }): readonly CrmWorkflowTask[] {

    return requireProjectDetail(input.projectId)?.workflowTasks ?? [];

  }



  create(input: CreateCrmWorkflowTaskInput): CrmWorkflowTask {

    const detail = requireProjectDetail(input.projectId);

    if (detail == null) throw new Error('Project not found');

    const assignee =

      input.assignedMemberId != null ? getMockCrmTeamMember(input.assignedMemberId) : null;

    const isPayment = input.amountCents != null;
    const now = new Date().toISOString();
    const timing = resolvePaymentTimingFields({
      isPayment,
      previousStatus: input.status,
      nextStatus: input.status,
      previousInvoicedAt: null,
      previousPaidAt: null,
      invoicedAt: input.invoicedAt,
      paidAt: input.paidAt,
      now,
    });

    const task: CrmWorkflowTask = {

      id: `wf-mock-${Date.now()}`,

      title: input.title,

      stageSlug: input.stageSlug,

      status: input.status,

      documentsRequired: input.documentsRequired,

      notes: input.notes,

      assignedTo: assignee,

      dueAt: input.dueAt,

      completedAt: input.status === 'done' ? now : null,

      completedBy: input.status === 'done' ? assignee : null,

      sortOrder: detail.workflowTasks.length + 1,

      amountCents: input.amountCents ?? null,

      invoicedAt: isPayment ? timing.invoicedAt : null,

      paidAt: isPayment ? timing.paidAt : null,

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

    const now = new Date().toISOString();
    const nextAmount =
      input.amountCents !== undefined ? input.amountCents : found.task.amountCents;
    const isPayment = nextAmount != null;
    const timing = resolvePaymentTimingFields({
      isPayment,
      previousStatus: found.task.status,
      nextStatus,
      previousInvoicedAt: found.task.invoicedAt,
      previousPaidAt: found.task.paidAt,
      invoicedAt: input.invoicedAt,
      paidAt: input.paidAt,
      now,
    });

    const next: CrmWorkflowTask = {

      ...found.task,

      title: input.title ?? found.task.title,

      stageSlug: input.stageSlug ?? found.task.stageSlug,

      status: nextStatus,

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

        nextStatus === 'done' ? found.task.completedAt ?? now : null,

      completedBy: nextStatus === 'done' ? found.task.completedBy ?? found.task.assignedTo : null,

      amountCents: nextAmount,

      invoicedAt: isPayment ? timing.invoicedAt : null,

      paidAt: isPayment ? timing.paidAt : null,

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

  listByBudgetEntryId(input: {
    projectSlug: string;
    budgetEntryId: string;
  }): readonly CrmDocumentMetadata[] {
    return mockListBudgetEntryDocuments(input);
  }

  uploadBudgetEntry(
    input: import('@/domain/crm/documentMutations').UploadBudgetEntryDocumentInput
  ): Promise<{ document: CrmDocumentMetadata }> {
    return mockUploadBudgetEntryDocument(
      getDocumentStorageProvider(),
      MOCK_ORG_ID,
      'mock-user',
      input
    ).then((document) => ({ document }));
  }

  deleteBudgetEntry(
    input: import('@/domain/crm/documentMutations').DeleteBudgetEntryDocumentInput
  ): Promise<void> {
    return mockDeleteBudgetEntryDocument(getDocumentStorageProvider(), MOCK_ORG_ID, input);
  }

  createBudgetEntryDownload(
    input: import('@/domain/crm/documentMutations').CreateBudgetEntryDocumentDownloadInput
  ): Promise<import('@/domain/crm/documentMutations').BudgetEntryDocumentDownload> {
    return mockCreateBudgetEntryDocumentDownload(
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



function saveBudgetEntries(slug: string, entries: readonly CrmBudgetEntry[]): CrmProjectDetail {

  const detail = getEffectiveMockProjectDetailBySlug(slug);

  if (detail == null) throw new Error('Project not found');

  return saveAndReturn(slug, { ...detail, budget: buildProjectBudgetSummary(entries) });

}



function findBudgetEntryProject(entryId: string): { slug: string; detail: CrmProjectDetail } | null {

  for (const summary of MOCK_CRM_PROJECT_SUMMARIES) {

    const detail = getEffectiveMockProjectDetailBySlug(summary.slug);

    if (!detail) continue;

    if (detail.budget.entries.some((e) => e.id === entryId)) {

      return { slug: summary.slug, detail };

    }

  }

  return null;

}



export class MockCrmBudgetRepository implements ICrmBudgetRepository {

  listByProject(input: { projectId: string }): readonly CrmBudgetEntry[] {

    return requireProjectDetail(input.projectId)?.budget.entries ?? [];

  }



  create(input: CreateCrmBudgetEntryInput): CrmBudgetEntry {

    const detail = requireProjectDetail(input.projectId);

    if (detail == null) throw new Error('Project not found');

    const assignee =

      input.assignedMemberId != null ? getMockCrmTeamMember(input.assignedMemberId) : null;

    const now = new Date().toISOString();

    const entry: CrmBudgetEntry = {

      id: `budget-mock-${Date.now()}`,

      itemName: input.itemName,

      category: input.category,

      costCents: input.costCents,

      budgetCents: input.budgetCents,

      notes: input.notes ?? null,

      assignedTo: assignee,

      occurredOn: input.occurredOn ?? null,

      documentCount: 0,

      documentsRequired: input.documentsRequired ?? true,

      createdAt: now,

      updatedAt: now,

    };

    saveBudgetEntries(detail.summary.slug, [...detail.budget.entries, entry]);

    return entry;

  }



  update(input: UpdateCrmBudgetEntryInput): CrmBudgetEntry | null {

    const found = findBudgetEntryProject(input.entryId);

    if (found == null) return null;

    const entries = found.detail.budget.entries.map((entry) => {

      if (entry.id !== input.entryId) return entry;

      const assignee =

        input.assignedMemberId !== undefined

          ? input.assignedMemberId

            ? getMockCrmTeamMember(input.assignedMemberId)

            : null

          : entry.assignedTo;

      return {

        ...entry,

        itemName: input.itemName ?? entry.itemName,

        category: input.category ?? entry.category,

        costCents: input.costCents ?? entry.costCents,

        budgetCents: input.budgetCents ?? entry.budgetCents,

        notes: input.notes !== undefined ? input.notes : entry.notes,

        assignedTo: assignee,

        occurredOn: input.occurredOn !== undefined ? input.occurredOn : entry.occurredOn,

        documentsRequired:
          input.documentsRequired !== undefined ? input.documentsRequired : entry.documentsRequired,

        updatedAt: new Date().toISOString(),

      };

    });

    saveBudgetEntries(found.slug, entries);

    return entries.find((e) => e.id === input.entryId) ?? null;

  }



  delete(input: DeleteCrmBudgetEntryInput): boolean {

    const found = findBudgetEntryProject(input.entryId);

    if (found == null) return false;

    const next = found.detail.budget.entries.filter((e) => e.id !== input.entryId);

    saveBudgetEntries(found.slug, next);

    return true;

  }

}


