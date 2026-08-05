/**
 * Client fetch helpers for Projects list v2 BFF routes.
 */

import type { CrmProjectSummary } from '@/domain/crm';
import type {
  CrmProjectsListV2CountResponse,
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2PageResponse,
  CrmProjectsListV2PageSummariesResponse,
  CrmProjectsListV2RootListItem,
} from '@/domain/crm/projectsListV2';
import { crmApiGetJson, crmApiPostJson } from './crmApiClient';

function appendCsv(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length === 0) return;
  params.set(key, values.join(','));
}

export function buildCrmProjectsListV2SearchParams(
  request: CrmProjectsListV2NormalizedRequest,
  cursor: string | null
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('view', request.view);
  if (request.search != null) params.set('search', request.search);
  params.set('sort', request.sort);
  params.set('limit', String(request.limit));
  if (cursor != null && cursor !== '') params.set('cursor', cursor);
  appendCsv(params, 'stageSlugs', request.filters.stageSlugs);
  appendCsv(params, 'priorities', request.filters.priorities);
  appendCsv(params, 'workflowTaskStatuses', request.filters.workflowTaskStatuses);
  appendCsv(params, 'assignedMemberIds', request.filters.assignedMemberIds);
  return params;
}

export async function fetchCrmProjectsListV2Page(input: {
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
}): Promise<CrmProjectsListV2PageResponse<CrmProjectsListV2RootListItem>> {
  const params = buildCrmProjectsListV2SearchParams(input.request, input.cursor);
  return crmApiGetJson<CrmProjectsListV2PageResponse<CrmProjectsListV2RootListItem>>(
    `/api/crm/projects/v2?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmProjectsListV2Count(input: {
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly signal?: AbortSignal;
}): Promise<CrmProjectsListV2CountResponse> {
  const params = buildCrmProjectsListV2SearchParams(input.request, null);
  params.delete('cursor');
  return crmApiGetJson<CrmProjectsListV2CountResponse>(
    `/api/crm/projects/v2/count?${params.toString()}`,
    { signal: input.signal }
  );
}

/**
 * Project-page Subprojects list v2 (parent resolved by slug on the server).
 * Uses children_of_parent request shape; client parent id is never sent as authority.
 */
export async function fetchCrmChildProjectsListV2Page(input: {
  readonly parentSlug: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
}): Promise<CrmProjectsListV2PageResponse<CrmProjectSummary>> {
  const slug = encodeURIComponent(input.parentSlug.trim());
  const params = buildCrmProjectsListV2SearchParams(input.request, input.cursor);
  // Server binds parent from slug; omit client parentProjectId from the query string.
  params.delete('parentProjectId');
  return crmApiGetJson<CrmProjectsListV2PageResponse<CrmProjectSummary>>(
    `/api/crm/projects/${slug}/subprojects/v2?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmChildProjectsListV2Count(input: {
  readonly parentSlug: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly signal?: AbortSignal;
}): Promise<CrmProjectsListV2CountResponse> {
  const slug = encodeURIComponent(input.parentSlug.trim());
  const params = buildCrmProjectsListV2SearchParams(input.request, null);
  params.delete('cursor');
  params.delete('parentProjectId');
  return crmApiGetJson<CrmProjectsListV2CountResponse>(
    `/api/crm/projects/${slug}/subprojects/v2/count?${params.toString()}`,
    { signal: input.signal }
  );
}

export async function fetchCrmProjectsListV2Summaries(input: {
  readonly projectIds: readonly string[];
  readonly signal?: AbortSignal;
}): Promise<CrmProjectsListV2PageSummariesResponse> {
  return crmApiPostJson<CrmProjectsListV2PageSummariesResponse>(
    '/api/crm/projects/v2/summaries',
    { projectIds: input.projectIds },
    { signal: input.signal }
  );
}
