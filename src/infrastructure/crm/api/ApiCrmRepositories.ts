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
  setApiCrmDetailCache,
} from './apiCrmDetailCache';



type ProjectsListResponse = {

  projects: CrmProjectSummary[];

  total: number;

};



export class ApiCrmProjectsRepository implements ICrmProjectsRepository {

  listSummaries(): Promise<readonly CrmProjectSummary[]> {

    return crmApiGetJson<ProjectsListResponse>('/api/crm/projects').then((body) => body.projects);

  }



  create(input: CreateCrmProjectInput): Promise<CreateCrmProjectResult> {

    return crmApiPostJson<CreateCrmProjectResult>('/api/crm/projects', input);

  }

}



export class ApiCrmProjectDetailRepository implements ICrmProjectDetailRepository {

  async getBySlug(slug: string): Promise<CrmProjectDetail | null> {

    const trimmed = slug.trim();

    if (!trimmed) return null;



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

        ...(input.amountCents != null ? { amountCents: input.amountCents } : {}),

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



  listByProjectId(projectId: string): Promise<readonly CrmWorkflowTask[]> {

    void projectId;

    return Promise.resolve([]);

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


