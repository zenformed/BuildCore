import type { ICrmReportsRepository } from '@/application/ports/crm/ICrmReportsRepository';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  getEffectiveMockProjectDetailBySlug,
  listEffectiveMockProjectSummaries,
} from './mockCrmMutationStore';

export class MockCrmReportsRepository implements ICrmReportsRepository {
  listProjectDetails(): readonly CrmProjectDetail[] {
    return listEffectiveMockProjectSummaries({ rootsOnly: false })
      .map((summary) => getEffectiveMockProjectDetailBySlug(summary.slug))
      .filter((detail): detail is CrmProjectDetail => detail != null);
  }
}
