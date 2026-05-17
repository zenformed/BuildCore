import type { CrmProjectDetail } from '@/domain/crm';

/** Project hub aggregate (summary + nested collections). */
export interface ICrmProjectDetailRepository {
  getBySlug(slug: string): CrmProjectDetail | null;
  getById(id: string): CrmProjectDetail | null;
}
