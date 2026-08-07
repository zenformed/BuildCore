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
import { isCrmProjectStatus, type CrmProjectStatus } from '@/domain/crm';
import type { CrmProjectsListFilters } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import {
  DEFAULT_CRM_PROJECT_STATUS_FILTER,
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  isDefaultCrmProjectStatusFilter,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { CRM_PRIORITY_FILTER_VALUES } from '@/domain/crm/projectPriorityToggle';
import { isWorkflowTaskStatus } from '@/domain/crm/workflowTaskStatuses';

export type CrmProjectsListV2UrlState = {
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
  readonly cursor: string | null;
  /**
   * 0-based page index for range chrome (`1–25 of N`).
   * Null when a cursor is present without a usable `page` param (legacy deep link).
   */
  readonly pageIndex: number | null;
  readonly request: CrmProjectsListV2NormalizedRequest;
};

/** Parse 1-based `page` URL param into a 0-based index. */
export function parseCrmProjectsListV2PageIndexParam(
  searchParams: URLSearchParams,
  cursor: string | null
): number | null {
  if (cursor == null) return 0;
  const raw = searchParams.get('page');
  if (raw == null || raw.trim() === '') return null;
  const pageOneBased = Number(raw.trim());
  if (!Number.isInteger(pageOneBased) || pageOneBased < 1) return null;
  return pageOneBased - 1;
}

function splitCsv(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Missing param → Active default. `all` → no status filter. */
export function parseCrmProjectStatusesUrlParam(raw: string | null): readonly CrmProjectStatus[] {
  if (raw == null || raw.trim() === '') {
    return [...DEFAULT_CRM_PROJECT_STATUS_FILTER];
  }
  if (raw.trim().toLowerCase() === 'all') {
    return [];
  }
  const parsed = splitCsv(raw).filter(isCrmProjectStatus);
  return parsed.length > 0 ? parsed : [...DEFAULT_CRM_PROJECT_STATUS_FILTER];
}

function defaultRequest(): CrmProjectsListV2NormalizedRequest {
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'roots',
    filters: { projectStatuses: [...DEFAULT_CRM_PROJECT_STATUS_FILTER] },
  });
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
  const projectStatuses = parseCrmProjectStatusesUrlParam(searchParams.get('projectStatuses'));

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
      projectStatuses,
    },
  });

  const request = normalized.ok ? normalized.request : defaultRequest();
  const cursorRaw = searchParams.get('cursor');
  const cursor =
    cursorRaw != null && cursorRaw.trim() !== '' ? cursorRaw.trim() : null;
  const pageIndex = parseCrmProjectsListV2PageIndexParam(searchParams, cursor);

  return {
    searchInput,
    filters: {
      ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
      stageSlugs: [...request.filters.stageSlugs],
      priorities: [...request.filters.priorities] as CrmProjectsListFilters['priorities'],
      workflowTaskStatuses: [
        ...request.filters.workflowTaskStatuses,
      ] as CrmProjectsListFilters['workflowTaskStatuses'],
      projectStatuses: [...request.filters.projectStatuses],
    },
    limit: request.limit,
    cursor,
    pageIndex,
    request,
  };
}

export function buildCrmProjectsListV2UrlSearchParams(input: {
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
  readonly cursor: string | null;
  /** 0-based; written as 1-based `page` when > 0 and a cursor is present. */
  readonly pageIndex?: number | null;
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
  if (input.filters.projectStatuses.length === 0) {
    params.set('projectStatuses', 'all');
  } else if (!isDefaultCrmProjectStatusFilter(input.filters.projectStatuses)) {
    params.set('projectStatuses', input.filters.projectStatuses.join(','));
  }
  if (input.limit !== CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE) {
    params.set('limit', String(input.limit));
  }
  if (input.sort != null && input.sort !== CRM_PROJECTS_LIST_V2_DEFAULT_SORT) {
    params.set('sort', input.sort);
  }
  if (input.cursor != null && input.cursor !== '') {
    params.set('cursor', input.cursor);
    if (
      input.pageIndex != null &&
      Number.isInteger(input.pageIndex) &&
      input.pageIndex > 0
    ) {
      params.set('page', String(input.pageIndex + 1));
    }
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
      projectStatuses: input.filters.projectStatuses,
    },
  });
  if (normalized.ok) return normalized.request;
  return defaultRequest();
}

/** URL keys owned by Projects/Subprojects list v2 (safe to replace on write). */
export const CRM_PROJECTS_LIST_V2_URL_PARAM_KEYS = [
  'q',
  'search',
  'limit',
  'cursor',
  'page',
  'sort',
  'stageSlugs',
  'priorities',
  'workflowTaskStatuses',
  'assignedMemberIds',
  'projectStatuses',
] as const;

/**
 * Merge list v2 params into the current URL, preserving unrelated keys
 * (e.g. Project-page importSpreadsheet).
 */
export function mergeCrmProjectsListV2UrlSearchParams(
  current: URLSearchParams,
  listParams: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const key of CRM_PROJECTS_LIST_V2_URL_PARAM_KEYS) {
    next.delete(key);
  }
  for (const [key, value] of listParams.entries()) {
    next.set(key, value);
  }
  return next;
}

function defaultChildrenRequest(parentProjectId: string): CrmProjectsListV2NormalizedRequest {
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'children_of_parent',
    parentProjectId,
    filters: { projectStatuses: [...DEFAULT_CRM_PROJECT_STATUS_FILTER] },
  });
  if (!normalized.ok) {
    throw new Error('Failed to build default Subprojects list v2 request');
  }
  return normalized.request;
}

/** Parse Project-page Subprojects URL search params into list v2 UI state. */
export function parseCrmProjectsListV2ChildrenUrlState(
  searchParams: URLSearchParams,
  parentProjectId: string
): CrmProjectsListV2UrlState {
  const base = parseCrmProjectsListV2UrlState(searchParams);
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'children_of_parent',
    parentProjectId,
    search: base.searchInput,
    sort: CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
    limit: base.limit,
    filters: {
      stageSlugs: base.filters.stageSlugs,
      priorities: base.filters.priorities,
      workflowTaskStatuses: base.filters.workflowTaskStatuses,
      assignedMemberIds: [],
      projectStatuses: base.filters.projectStatuses,
    },
  });
  const request = normalized.ok ? normalized.request : defaultChildrenRequest(parentProjectId);
  return {
    ...base,
    filters: {
      ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
      stageSlugs: [...request.filters.stageSlugs],
      priorities: [...request.filters.priorities] as CrmProjectsListFilters['priorities'],
      workflowTaskStatuses: [
        ...request.filters.workflowTaskStatuses,
      ] as CrmProjectsListFilters['workflowTaskStatuses'],
      projectStatuses: [...request.filters.projectStatuses],
    },
    limit: request.limit,
    request,
  };
}

/** Build normalized children_of_parent request from UI draft. */
export function buildCrmProjectsListV2ChildrenRequestFromUi(input: {
  readonly parentProjectId: string;
  readonly searchInput: string;
  readonly filters: CrmProjectsListFilters;
  readonly limit: CrmProjectsListV2PageSize;
}): CrmProjectsListV2NormalizedRequest {
  const normalized = normalizeCrmProjectsListV2Request({
    view: 'children_of_parent',
    parentProjectId: input.parentProjectId,
    search: input.searchInput,
    sort: CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
    limit: input.limit,
    filters: {
      stageSlugs: input.filters.stageSlugs,
      priorities: input.filters.priorities,
      workflowTaskStatuses: input.filters.workflowTaskStatuses,
      assignedMemberIds: [],
      projectStatuses: input.filters.projectStatuses,
    },
  });
  if (normalized.ok) return normalized.request;
  return defaultChildrenRequest(input.parentProjectId);
}
