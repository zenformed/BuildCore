import type { ICrmReportsRepository } from '@/application/ports/crm/ICrmReportsRepository';
import type { CrmProjectDetail } from '@/domain/crm';
import { MOCK_CRM_PROJECT_SUMMARIES } from '@/platform/mock/crm';
import { getEffectiveMockProjectDetailBySlug } from './mockCrmMutationStore';

export class MockCrmReportsRepository implements ICrmReportsRepository {
  listProjectDetails(): readonly CrmProjectDetail[] {
    return MOCK_CRM_PROJECT_SUMMARIES.map((summary) =>
      getEffectiveMockProjectDetailBySlug(summary.slug)
    ).filter((detail): detail is CrmProjectDetail => detail != null);
  }
}
