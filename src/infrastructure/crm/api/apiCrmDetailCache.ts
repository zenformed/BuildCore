import type { CrmProjectDetail } from '@/domain/crm';

let cachedSlug: string | null = null;
let cachedDetail: CrmProjectDetail | null = null;

export function setApiCrmDetailCache(slug: string, detail: CrmProjectDetail | null): void {
  cachedSlug = slug;
  cachedDetail = detail;
}

export function getApiCrmDetailCacheBySlug(slug: string): CrmProjectDetail | null {
  if (cachedSlug !== slug || cachedDetail == null) return null;
  return cachedDetail;
}

export function getApiCrmDetailCacheByProjectId(projectId: string): CrmProjectDetail | null {
  if (cachedDetail?.summary.id === projectId) return cachedDetail;
  return null;
}
