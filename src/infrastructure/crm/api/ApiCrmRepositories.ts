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

  PaymentBalanceTask,

  WorkflowTaskStatus,

  UpdateCrmProjectInput,

  UpdateCrmWorkflowTaskInput,

} from '@/domain/crm';

import type {

  CreateCrmBudgetEntryInput,

  DeleteCrmBudgetEntryInput,

  UpdateCrmBudgetEntryInput,

} from '@/domain/crm/budgetMutations';

import { deserializeWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';

import {

  crmApiDeleteJson,

  crmApiGetJson,

  crmApiPatchJson,

  crmApiPostFormData,

  crmApiPostJson,

  CrmApiError,

} from './crmApiClient';

import {
  clearApiCrmDetailCache,
  getApiCrmDetailCacheByProjectId,
  getApiCrmDetailCacheBySlug,
  isApiCrmDetailCacheResolvedForSlug,
  setApiCrmDetailCache,
} from './apiCrmDetailCache';
import { runInFlight } from '@/infrastructure/coreApi/clientRequestDedupe';



type ProjectsListResponse = {

  projects: CrmProjectSummary[];

  total: number;

};



export class ApiCrmProjectsRepository implements ICrmProjectsRepository {

  listSummaries(options?: { rootsOnly?: boolean }): Promise<readonly CrmProjectSummary[]> {
    const rootsOnly = options?.rootsOnly !== false;
    const query = rootsOnly ? '' : '?includeSubprojects=1';
    return crmApiGetJson<ProjectsListResponse>(`/api/crm/projects${query}`).then(
      (body) => body.projects
    );
  }

  listChildSummaries(input: {
    parentProjectId: string;
    parentSlug: string;
  }): Promise<readonly CrmProjectSummary[]> {
    void input.parentProjectId;
    const parentSlug = input.parentSlug.trim();
    return crmApiGetJson<{ projects: CrmProjectSummary[] }>(
      `/api/crm/projects/${encodeURIComponent(parentSlug)}/subprojects`
    ).then((body) => body.projects);
  }

  listPaymentBalanceTasks() {
    return crmApiGetJson<{ byProjectId: Record<string, PaymentBalanceTask[]> }>(
      '/api/crm/projects/payment-balance-tasks'
    ).then((body) => new Map(Object.entries(body.byProjectId)));
  }

  listWorkflowTaskStatuses() {
    return crmApiGetJson<{ byProjectId: Record<string, WorkflowTaskStatus[]> }>(
      '/api/crm/projects/workflow-task-statuses'
    ).then((body) => deserializeWorkflowTaskStatusIndex(body.byProjectId));
  }

  listBudgetEntries() {
    return crmApiGetJson<{ byProjectId: Record<string, CrmBudgetEntry[]> }>(
      '/api/crm/projects/budget-entries'
    ).then((body) => new Map(Object.entries(body.byProjectId)));
  }

  getSummaryBySlug(slug: string): Promise<CrmProjectSummary | null> {
    const trimmed = slug.trim();
    if (!trimmed) return Promise.resolve(null);
    return crmApiGetJson<CrmProjectSummary>(
      `/api/crm/projects/${encodeURIComponent(trimmed)}/summary`
    ).catch((err) => {
      if (err instanceof CrmApiError && err.status === 404) return null;
      throw err;
    });
  }



  create(input: CreateCrmProjectInput): Promise<CreateCrmProjectResult> {

    return crmApiPostJson<CreateCrmProjectResult>('/api/crm/projects', input);

  }

  archive(slug: string): Promise<boolean> {
    clearApiCrmDetailCache();
    return crmApiDeleteJson<{ ok: boolean }>(
      `/api/crm/projects/${encodeURIComponent(slug.trim())}`
    )
      .then(() => true)
      .catch((err) => {
        if (err instanceof CrmApiError && err.status === 404) return false;
        throw err;
      });
  }

}



export class ApiCrmProjectDetailRepository implements ICrmProjectDetailRepository {

  async getBySlug(slug: string): Promise<CrmProjectDetail | null> {

    const trimmed = slug.trim();

    if (!trimmed) return null;

    if (isApiCrmDetailCacheResolvedForSlug(trimmed)) {
      return getApiCrmDetailCacheBySlug(trimmed);
    }

    return runInFlight(`crm:project-detail:${trimmed}`, async () => {
      if (isApiCrmDetailCacheResolvedForSlug(trimmed)) {
        return getApiCrmDetailCacheBySlug(trimmed);
      }

      try {

        const detail = await crmApiGetJson<CrmProjectDetail>(

          `/api/crm/projects/${encodeURIComponent(trimmed)}`

        );

        setApiCrmDetailCache(trimmed, detail);

        return detail;

      } catch (err) {

        if (err instanceof CrmApiError && err.status === 404) {

          setApiCrmDetailCache(trimmed, null);

          return null;

        }

        throw err;

      }
    });

  }



  async getById(id: string): Promise<CrmProjectDetail | null> {

    void id;

    return null;

  }



  async updateBySlug(slug: string, input: UpdateCrmProjectInput): Promise<CrmProjectDetail | null> {

    clearApiCrmDetailCache();

    try {

      const detail = await crmApiPatchJson<CrmProjectDetail>(

        `/api/crm/projects/${encodeURIComponent(slug.trim())}`,

        input

      );

      setApiCrmDetailCache(slug.trim(), detail);

      return detail;

    } catch (err) {

      if (err instanceof CrmApiError && err.status === 404) return null;

      throw err;

    }

  }



  async setCompletion(slug: string, complete: boolean): Promise<CrmProjectDetail | null> {

    clearApiCrmDetailCache();

    try {

      const detail = await crmApiPostJson<CrmProjectDetail>(

        `/api/crm/projects/${encodeURIComponent(slug.trim())}/completion`,

        { complete }

      );

      setApiCrmDetailCache(slug.trim(), detail);

      return detail;

    } catch (err) {

      if (err instanceof CrmApiError && err.status === 404) return null;

      throw err;

    }

  }

}



export class ApiCrmWorkflowTasksRepository implements ICrmWorkflowTasksRepository {

  create(input: CreateCrmWorkflowTaskInput): Promise<CrmWorkflowTask> {

    const slug =
      input.projectSlug?.trim() ||
      getApiCrmDetailCacheByProjectId(input.projectId)?.summary.slug ||
      '';

    if (!slug) {
      return Promise.reject(new CrmApiError('not_found', 404, 'Project not loaded'));
    }

    clearApiCrmDetailCache();

    return crmApiPostJson<CrmWorkflowTask>(

      `/api/crm/projects/${encodeURIComponent(slug)}/tasks`,

      {

        title: input.title,

        stageSlug: input.stageSlug,

        status: input.status,

        documentsRequired: input.documentsRequired,

        dueAt: input.dueAt,

        notes: input.notes,

        assignedMemberId: input.assignedMemberId,

        ...(input.amountCents != null
          ? {
              amountCents: input.amountCents,
              invoicedAt: input.invoicedAt ?? null,
              paidAt: input.paidAt ?? null,
            }
          : {}),

      }

    );

  }



  update(input: UpdateCrmWorkflowTaskInput): Promise<CrmWorkflowTask | null> {

    clearApiCrmDetailCache();

    return crmApiPatchJson<CrmWorkflowTask>(

      `/api/crm/tasks/${encodeURIComponent(input.taskId)}`,

      {

        title: input.title,

        stageSlug: input.stageSlug,

        status: input.status,

        documentsRequired: input.documentsRequired,

        dueAt: input.dueAt,

        notes: input.notes,

        assignedMemberId: input.assignedMemberId,

        ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
        ...(input.invoicedAt !== undefined ? { invoicedAt: input.invoicedAt } : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),

      }

    ).catch((err) => {

      if (err instanceof CrmApiError && err.status === 404) return null;

      throw err;

    });

  }



  archive(taskId: string): Promise<boolean> {

    clearApiCrmDetailCache();

    return crmApiDeleteJson<{ ok: boolean }>(`/api/crm/tasks/${encodeURIComponent(taskId)}`).then(

      () => true

    );

  }



  listByProject(input: {
    projectId: string;
    projectSlug: string;
  }): Promise<readonly CrmWorkflowTask[]> {
    void input.projectId;
    const slug = input.projectSlug.trim();
    if (!slug) {
      return Promise.reject(new CrmApiError('not_found', 404, 'Project not loaded'));
    }
    return crmApiGetJson<{ tasks: CrmWorkflowTask[] }>(
      `/api/crm/projects/${encodeURIComponent(slug)}/tasks`
    ).then((body) => body.tasks);
  }

}



export class ApiCrmDocumentsRepository implements ICrmDocumentsRepository {

  listByProjectId(projectId: string): Promise<readonly CrmDocumentMetadata[]> {

    void projectId;

    return Promise.resolve([]);

  }

  listByWorkflowTaskId(input: {
    projectSlug: string;
    workflowTaskId: string;
  }): Promise<readonly CrmDocumentMetadata[]> {
    return crmApiGetJson<{ documents: CrmDocumentMetadata[] }>(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/tasks/${encodeURIComponent(input.workflowTaskId)}/documents`
    ).then((body) => body.documents);
  }

  upload(input: {
    projectSlug: string;
    workflowTaskId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    body: ArrayBuffer;
  }): Promise<{ document: CrmDocumentMetadata }> {
    clearApiCrmDetailCache();
    const formData = new FormData();
    formData.set(
      'file',
      new Blob([input.body], { type: input.mimeType }),
      input.fileName
    );
    return crmApiPostFormData<{ document: CrmDocumentMetadata }>(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/tasks/${encodeURIComponent(input.workflowTaskId)}/documents`,
      formData
    );
  }

  delete(input: {
    projectSlug: string;
    workflowTaskId: string;
    documentId: string;
  }): Promise<void> {
    clearApiCrmDetailCache();
    return crmApiDeleteJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/tasks/${encodeURIComponent(input.workflowTaskId)}/documents/${encodeURIComponent(input.documentId)}`
    ).then(() => undefined);
  }

  createDownload(input: {
    projectSlug: string;
    workflowTaskId: string;
    documentId: string;
  }): Promise<{ url: string; fileName: string; mimeType: string }> {
    return crmApiGetJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/tasks/${encodeURIComponent(input.workflowTaskId)}/documents/${encodeURIComponent(input.documentId)}/download`
    );
  }

  listByBudgetEntryId(input: {
    projectSlug: string;
    budgetEntryId: string;
  }): Promise<readonly CrmDocumentMetadata[]> {
    return crmApiGetJson<{ documents: CrmDocumentMetadata[] }>(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/budget-entries/${encodeURIComponent(input.budgetEntryId)}/documents`
    ).then((body) => body.documents);
  }

  uploadBudgetEntry(input: {
    projectSlug: string;
    budgetEntryId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    body: ArrayBuffer;
  }): Promise<{ document: CrmDocumentMetadata }> {
    clearApiCrmDetailCache();
    const formData = new FormData();
    formData.set(
      'file',
      new Blob([input.body], { type: input.mimeType }),
      input.fileName
    );
    return crmApiPostFormData<{ document: CrmDocumentMetadata }>(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/budget-entries/${encodeURIComponent(input.budgetEntryId)}/documents`,
      formData
    );
  }

  deleteBudgetEntry(input: {
    projectSlug: string;
    budgetEntryId: string;
    documentId: string;
  }): Promise<void> {
    clearApiCrmDetailCache();
    return crmApiDeleteJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/budget-entries/${encodeURIComponent(input.budgetEntryId)}/documents/${encodeURIComponent(input.documentId)}`
    ).then(() => undefined);
  }

  createBudgetEntryDownload(input: {
    projectSlug: string;
    budgetEntryId: string;
    documentId: string;
  }): Promise<{ url: string; fileName: string; mimeType: string }> {
    return crmApiGetJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/budget-entries/${encodeURIComponent(input.budgetEntryId)}/documents/${encodeURIComponent(input.documentId)}/download`
    );
  }

  deleteProjectMedia(input: { projectSlug: string; documentId: string }): Promise<void> {
    clearApiCrmDetailCache();
    return crmApiDeleteJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/media/${encodeURIComponent(input.documentId)}`
    ).then(() => undefined);
  }

  createProjectMediaDownload(input: {
    projectSlug: string;
    documentId: string;
  }): Promise<{ url: string; fileName: string; mimeType: string }> {
    return crmApiGetJson(
      `/api/crm/projects/${encodeURIComponent(input.projectSlug)}/media/${encodeURIComponent(input.documentId)}/download`
    );
  }

}



export class ApiCrmMilestonePaymentsRepository implements ICrmMilestonePaymentsRepository {

  getByProjectId(projectId: string): Promise<CrmMilestonePaymentSummary | null> {

    void projectId;

    return Promise.resolve(null);

  }

}



export class ApiCrmAccountabilityRepository implements ICrmAccountabilityRepository {

  listByProjectId(projectId: string): Promise<readonly CrmAccountabilityAction[]> {

    void projectId;

    return Promise.resolve([]);

  }

}



export class ApiCrmBudgetRepository implements ICrmBudgetRepository {

  listByProject(input: {
    projectId: string;
    projectSlug: string;
  }): Promise<readonly CrmBudgetEntry[]> {
    void input.projectId;
    const slug = input.projectSlug.trim();
    if (!slug) {
      return Promise.reject(new CrmApiError('not_found', 404, 'Project not loaded'));
    }
    return crmApiGetJson<{ entries: CrmBudgetEntry[] }>(
      `/api/crm/projects/${encodeURIComponent(slug)}/budget-entries`
    ).then((body) => body.entries);
  }



  create(input: CreateCrmBudgetEntryInput): Promise<CrmBudgetEntry> {

    const slug = input.projectSlug.trim();

    clearApiCrmDetailCache();

    return crmApiPostJson<CrmBudgetEntry>(

      `/api/crm/projects/${encodeURIComponent(slug)}/budget-entries`,

      {

        itemName: input.itemName,

        category: input.category,

        costCents: input.costCents,

        budgetCents: input.budgetCents,

        notes: input.notes,

        assignedMemberId: input.assignedMemberId,

        costIncurredAt: input.costIncurredAt,

        documentsRequired: input.documentsRequired,

      }

    );

  }



  update(input: UpdateCrmBudgetEntryInput): Promise<CrmBudgetEntry | null> {

    clearApiCrmDetailCache();

    const params = new URLSearchParams({ projectSlug: input.projectSlug });

    return crmApiPatchJson<CrmBudgetEntry>(

      `/api/crm/budget-entries/${encodeURIComponent(input.entryId)}?${params.toString()}`,

      {

        itemName: input.itemName,

        category: input.category,

        costCents: input.costCents,

        budgetCents: input.budgetCents,

        notes: input.notes,

        assignedMemberId: input.assignedMemberId,

        costIncurredAt: input.costIncurredAt,

        documentsRequired: input.documentsRequired,

      }

    ).catch((err) => {

      if (err instanceof CrmApiError && err.status === 404) return null;

      throw err;

    });

  }



  delete(input: DeleteCrmBudgetEntryInput): Promise<boolean> {

    clearApiCrmDetailCache();

    return crmApiDeleteJson(

      `/api/crm/budget-entries/${encodeURIComponent(input.entryId)}`

    )

      .then(() => true)

      .catch((err) => {

        if (err instanceof CrmApiError && err.status === 404) return false;

        throw err;

      });

  }

}


