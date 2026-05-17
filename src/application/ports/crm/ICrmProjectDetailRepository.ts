import type { CrmProjectDetail, UpdateCrmProjectInput } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

/** Project hub aggregate (summary + nested collections). */
export interface ICrmProjectDetailRepository {
  getBySlug(slug: string): CrmRepositoryResult<CrmProjectDetail | null>;
  getById(id: string): CrmRepositoryResult<CrmProjectDetail | null>;
  updateBySlug(slug: string, input: UpdateCrmProjectInput): CrmRepositoryResult<CrmProjectDetail | null>;
}
