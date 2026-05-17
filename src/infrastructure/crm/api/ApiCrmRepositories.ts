import type {
  ICrmAccountabilityRepository,
  ICrmDocumentsRepository,
  ICrmMilestonePaymentsRepository,
  ICrmProjectDetailRepository,
  ICrmProjectsRepository,
  ICrmWorkflowTasksRepository,
} from '@/application/ports/crm';
import type {
  CrmAccountabilityAction,
  CrmDocumentMetadata,
  CrmMilestonePaymentSummary,
  CrmProjectDetail,
  CrmProjectSummary,
  CrmWorkflowTask,
} from '@/domain/crm';
import { crmApiGetJson, CrmApiError } from './crmApiClient';
import {
  getApiCrmDetailCacheByProjectId,
  getApiCrmDetailCacheBySlug,
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
}

export class ApiCrmProjectDetailRepository implements ICrmProjectDetailRepository {
  async getBySlug(slug: string): Promise<CrmProjectDetail | null> {
    const trimmed = slug.trim();
    if (!trimmed) return null;

    const cached = getApiCrmDetailCacheBySlug(trimmed);
    if (cached) return cached;

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
    const cached = getApiCrmDetailCacheByProjectId(id);
    return cached ?? null;
  }
}

function detailForProject(projectId: string): CrmProjectDetail | null {
  return getApiCrmDetailCacheByProjectId(projectId);
}

export class ApiCrmWorkflowTasksRepository implements ICrmWorkflowTasksRepository {
  listByProjectId(projectId: string): Promise<readonly CrmWorkflowTask[]> {
    return Promise.resolve(detailForProject(projectId)?.workflowTasks ?? []);
  }
}

export class ApiCrmDocumentsRepository implements ICrmDocumentsRepository {
  listByProjectId(projectId: string): Promise<readonly CrmDocumentMetadata[]> {
    return Promise.resolve(detailForProject(projectId)?.documents ?? []);
  }
}

export class ApiCrmMilestonePaymentsRepository implements ICrmMilestonePaymentsRepository {
  getByProjectId(projectId: string): Promise<CrmMilestonePaymentSummary | null> {
    return Promise.resolve(detailForProject(projectId)?.milestonePayment ?? null);
  }
}

export class ApiCrmAccountabilityRepository implements ICrmAccountabilityRepository {
  listByProjectId(projectId: string): Promise<readonly CrmAccountabilityAction[]> {
    return Promise.resolve(detailForProject(projectId)?.accountabilityLog ?? []);
  }
}
