/**
 * Client fetch helpers for Documents list v2 BFF.
 */

import {
  CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_DOCUMENTS_LIST_V2_SEARCH_MIN_LENGTH,
  type CrmDocumentsListV2PageResponse,
  type CrmDocumentsListV2PageSize,
} from '@/domain/crm/documentsListV2';
import { crmApiGetJson } from './crmApiClient';

export function buildCrmDocumentsListV2SearchParams(input: {
  readonly searchInput: string;
  readonly limit?: CrmDocumentsListV2PageSize;
  readonly cursor?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit ?? CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE));
  const trimmed = input.searchInput.trim();
  if (trimmed.length >= CRM_DOCUMENTS_LIST_V2_SEARCH_MIN_LENGTH) {
    params.set('search', trimmed);
  }
  if (input.cursor != null && input.cursor !== '') {
    params.set('cursor', input.cursor);
  }
  return params;
}

export async function fetchCrmDocumentsListV2Page(input: {
  readonly projectSlug: string;
  readonly searchInput: string;
  readonly limit?: CrmDocumentsListV2PageSize;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
}): Promise<CrmDocumentsListV2PageResponse> {
  const slug = encodeURIComponent(input.projectSlug.trim());
  const params = buildCrmDocumentsListV2SearchParams({
    searchInput: input.searchInput,
    limit: input.limit,
    cursor: input.cursor,
  });
  return crmApiGetJson<CrmDocumentsListV2PageResponse>(
    `/api/crm/projects/${slug}/documents/v2?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmDocumentsHasNewerV2(input: {
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
    `/api/crm/projects/${slug}/documents/v2?${params.toString()}`,
    { signal: input.signal }
  );
}
