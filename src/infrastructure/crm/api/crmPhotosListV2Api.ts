/**
 * Client fetch helpers for Photos list v2 BFF.
 */

import {
  CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_PHOTOS_LIST_V2_SEARCH_MIN_LENGTH,
  type CrmPhotosListV2PageResponse,
  type CrmPhotosListV2PageSize,
} from '@/domain/crm/photosListV2';
import { crmApiGetJson } from './crmApiClient';

export function buildCrmPhotosListV2SearchParams(input: {
  readonly searchInput: string;
  readonly limit?: CrmPhotosListV2PageSize;
  readonly cursor?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(input.limit ?? CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE));
  const trimmed = input.searchInput.trim();
  if (trimmed.length >= CRM_PHOTOS_LIST_V2_SEARCH_MIN_LENGTH) {
    params.set('search', trimmed);
  }
  if (input.cursor != null && input.cursor !== '') {
    params.set('cursor', input.cursor);
  }
  return params;
}

export async function fetchCrmPhotosListV2Page(input: {
  readonly searchInput: string;
  readonly limit?: CrmPhotosListV2PageSize;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
}): Promise<CrmPhotosListV2PageResponse> {
  const params = buildCrmPhotosListV2SearchParams({
    searchInput: input.searchInput,
    limit: input.limit,
    cursor: input.cursor,
  });
  return crmApiGetJson<CrmPhotosListV2PageResponse>(
    `/api/crm/photos/v2?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmPhotosHasNewerV2(input: {
  readonly afterCreatedAt: string;
  readonly afterId: string;
  readonly signal?: AbortSignal;
}): Promise<{ readonly hasNewer: boolean }> {
  const params = new URLSearchParams();
  params.set('probe', 'newer');
  params.set('afterCreatedAt', input.afterCreatedAt);
  params.set('afterId', input.afterId);
  return crmApiGetJson<{ readonly hasNewer: boolean }>(
    `/api/crm/photos/v2?${params.toString()}`,
    { signal: input.signal }
  );
}
