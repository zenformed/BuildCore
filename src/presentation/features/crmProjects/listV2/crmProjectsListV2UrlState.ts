/**
 * URL ↔ Projects list v2 request state (dashboard).
 * Browser Back restores search, filters, sort, limit, and cursor.
 */

import {
  CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
  normalizeCrmProjectsListV2Request,
  type CrmProjectsListV2NormalizedRequest,
  type CrmProjectsListV2PageSize,
} from '@/domain/crm/projectsListV2';
import type { CrmProjectsListFilters } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { EMPTY_CRM_PROJECTS_LIST_FILTERS } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { CRM_PRIORITY_FILTER_VALUES } from '@/domain/crm/projectPriorityToggle';
import { isWorkflowTaskStatus } from '@/domain/crm/workflowTaskStatuses';

export type CrmProjectsListV2UrlState = {
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
  readonly cursor: string | null;
  readonly request: CrmProjectsListV2NormalizedRequest;
};

function splitCsv(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function defaultRequest(): CrmProjectsListV2NormalizedRequest {
  const normalized = normalizeCrmProjectsListV2Request({ view: 'roots' });
  if (!normalized.ok) {
    throw new Error('Failed to build default Projects list v2 request');
  }
  return normalized.request;
}

/** Parse dashboard URL search params into list v2 state. Invalid values fall back safely. */
export function parseCrmProjectsListV2UrlState(
  searchParams: URLSearchParams
): CrmProjectsListV2UrlState {
  const searchInput = searchParams.get('q') ?? searchParams.get('search') ?? '';
  const stageSlugs = splitCsv(searchParams.get('stageSlugs'));
  const priorities = splitCsv(searchParams.get('priorities')).filter((value) =>
    (CRM_PRIORITY_FILTER_VALUES as readonly string[]).includes(value)
  );
  const workflowTaskStatuses = splitCsv(searchParams.get('workflowTaskStatuses')).filter(
    isWorkflowTaskStatus
  );

  const normalized = normalizeCrmProjectsListV2Request({
    view: 'roots',
    search: searchInput,
    sort: searchParams.get('sort') ?? CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
    limit: searchParams.get('limit') ?? CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    filters: {
      stageSlugs,
      priorities,
      workflowTaskStatuses,
      assignedMemberIds: [],
    },
  });

  const request = normalized.ok ? normalized.request : defaultRequest();
  const cursorRaw = searchParams.get('cursor');
  const cursor =
    cursorRaw != null && cursorRaw.trim() !== '' ? cursorRaw.trim() : null;

  return {
    searchInput,
    filters: {
      ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
      stageSlugs: [...request.filters.stageSlugs],
      priorities: [...request.filters.priorities] as CrmProjectsListFilters['priorities'],
      workflowTaskStatuses: [
        ...request.filters.workflowTaskStatuses,
      ] as CrmProjectsListFilters['workflowTaskStatuses'],
    },
    limit: request.limit,
    cursor,
    request,
  };
}

export function buildCrmProjectsListV2UrlSearchParams(input: {
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
  readonly cursor: string | null;
  readonly sort?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedSearch = input.searchInput.trim();
  if (trimmedSearch.length > 0) params.set('q', trimmedSearch);
  if (input.filters.stageSlugs.length > 0) {
    params.set('stageSlugs', input.filters.stageSlugs.join(','));
  }
  if (input.filters.priorities.length > 0) {
    params.set('priorities', input.filters.priorities.join(','));
  }
  if (input.filters.workflowTaskStatuses.length > 0) {
    params.set('workflowTaskStatuses', input.filters.workflowTaskStatuses.join(','));
  }
  if (input.limit !== CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE) {
    params.set('limit', String(input.limit));
  }
  if (input.sort != null && input.sort !== CRM_PROJECTS_LIST_V2_DEFAULT_SORT) {
    params.set('sort', input.sort);
  }
  if (input.cursor != null && input.cursor !== '') {
    params.set('cursor', input.cursor);
  }
  return params;
}

/** Build normalized request from UI draft (applies search min-length rules). */
export function buildCrmProjectsListV2RequestFromUi(input: {
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
}): CrmProjectsListV2NormalizedRequest {
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'roots',
    search: input.searchInput,
    sort: CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
    limit: input.limit,
    filters: {
      stageSlugs: input.filters.stageSlugs,
      priorities: input.filters.priorities,
      workflowTaskStatuses: input.filters.workflowTaskStatuses,
      assignedMemberIds: [],
    },
  });
  if (normalized.ok) return normalized.request;
  return defaultRequest();
}
