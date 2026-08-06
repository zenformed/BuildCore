/**
 * Client fetch helpers for Accountability list v2 BFF.
 */

import {
  CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_ACCOUNTABILITY_LIST_V2_SEARCH_MIN_LENGTH,
  type CrmAccountabilityListV2PageResponse,
  type CrmAccountabilityListV2PageSize,
} from '@/domain/crm/accountabilityListV2';
import { crmApiGetJson } from './crmApiClient';

export function buildCrmAccountabilityListV2SearchParams(input: {
  readonly searchInput: string;
  readonly limit?: CrmAccountabilityListV2PageSize;
  readonly cursor?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit ?? CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE));
  const trimmed = input.searchInput.trim();
  if (trimmed.length >= CRM_ACCOUNTABILITY_LIST_V2_SEARCH_MIN_LENGTH) {
    params.set('search', trimmed);
  }
  if (input.cursor != null && input.cursor !== '') {
    params.set('cursor', input.cursor);
  }
  return params;
}

export async function fetchCrmAccountabilityListV2Page(input: {
  readonly projectSlug: string;
  readonly searchInput: string;
  readonly limit?: CrmAccountabilityListV2PageSize;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
}): Promise<CrmAccountabilityListV2PageResponse> {
  const slug = encodeURIComponent(input.projectSlug.trim());
  const params = buildCrmAccountabilityListV2SearchParams({
    searchInput: input.searchInput,
    limit: input.limit,
    cursor: input.cursor,
  });
  return crmApiGetJson<CrmAccountabilityListV2PageResponse>(
    `/api/crm/projects/${slug}/accountability/v2?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmAccountabilityHasNewerV2(input: {
  readonly projectSlug: string;
  readonly afterCreatedAt: string;
  readonly afterId: string;
  readonly signal?: AbortSignal;
}): Promise<{ readonly hasNewer: boolean }> {
  const slug = encodeURIComponent(input.projectSlug.trim());
  const params = new URLSearchParams();
  params.set('probe', 'newer');
  params.set('afterCreatedAt', input.afterCreatedAt);
  params.set('afterId', input.afterId);
  return crmApiGetJson<{ readonly hasNewer: boolean }>(
    `/api/crm/projects/${slug}/accountability/v2?${params.toString()}`,
    { signal: input.signal }
  );
}
