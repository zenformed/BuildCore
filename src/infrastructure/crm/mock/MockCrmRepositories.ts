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
  CrmAccountabilityAction,
  CrmDocumentMetadata,
  CrmMilestonePaymentSummary,
  CrmProjectDetail,
  CrmProjectSummary,
  CrmWorkflowTask,
} from '@/domain/crm';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import {
  getMockCrmProjectDetailById,
  getMockCrmProjectDetailBySlug,
  MOCK_CRM_PROJECT_SUMMARIES,
} from '@/platform/mock/crm';

export class MockCrmProjectsRepository implements ICrmProjectsRepository {
  listSummaries(): readonly CrmProjectSummary[] {
    return MOCK_CRM_PROJECT_SUMMARIES;
  }

  create(_input: CreateCrmProjectInput): Promise<CreateCrmProjectResult> {
    return Promise.reject(new CrmCreateNotAvailableError());
  }
}

export class MockCrmProjectDetailRepository implements ICrmProjectDetailRepository {
  getBySlug(slug: string): CrmProjectDetail | null {
    return getMockCrmProjectDetailBySlug(slug) ?? null;
  }

  getById(id: string): CrmProjectDetail | null {
    return getMockCrmProjectDetailById(id) ?? null;
  }
}

function requireProjectDetail(projectId: string): CrmProjectDetail | null {
  return getMockCrmProjectDetailById(projectId) ?? null;
}

export class MockCrmWorkflowTasksRepository implements ICrmWorkflowTasksRepository {
  listByProjectId(projectId: string): readonly CrmWorkflowTask[] {
    return requireProjectDetail(projectId)?.workflowTasks ?? [];
  }
}

export class MockCrmDocumentsRepository implements ICrmDocumentsRepository {
  listByProjectId(projectId: string): readonly CrmDocumentMetadata[] {
    return requireProjectDetail(projectId)?.documents ?? [];
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
