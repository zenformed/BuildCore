import { CRM_PRIORITY_FILTER_VALUES, type CrmPriorityFilterValue } from '../projectPriorityToggle';
import { isWorkflowTaskStatus } from '../workflowTaskStatuses';
import { encodeCrmProjectsListV2FingerprintCanonical } from './fingerprint';
import {
  CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_PROJECTS_LIST_V2_DEFAULT_SORT,
  CRM_PROJECTS_LIST_V2_PAGE_SIZES,
  CRM_PROJECTS_LIST_V2_SEARCH_MIN_LENGTH,
  CRM_PROJECTS_LIST_V2_SORT_MODES,
  CRM_PROJECTS_LIST_V2_VIEWS,
  CRM_LIST_FILTER_UNASSIGNED_ASSIGNEE_ID,
  type CrmProjectsListV2Filters,
  type CrmProjectsListV2NormalizedRequest,
  type CrmProjectsListV2PageSize,
  type CrmProjectsListV2SortMode,
  type CrmProjectsListV2View,
} from './types';
import type { PipelineStageSlug } from '../pipelineStage';
import type { WorkflowTaskStatus } from '../workflowTask';
import type { CrmPriority } from '../project';
import { isCrmProjectStatus, type CrmProjectStatus } from '../projectStatus';

export type NormalizeCrmProjectsListV2RequestInput = {
  readonly view?: unknown;
  readonly parentProjectId?: unknown;
  readonly search?: unknown;
  readonly sort?: unknown;
  readonly limit?: unknown;
  readonly filters?: {
    readonly stageSlugs?: unknown;
    readonly priorities?: unknown;
    readonly workflowTaskStatuses?: unknown;
    readonly assignedMemberIds?: unknown;
    readonly projectStatuses?: unknown;
  } | null;
};

export type NormalizeCrmProjectsListV2RequestResult =
  | { readonly ok: true; readonly request: CrmProjectsListV2NormalizedRequest }
  | { readonly ok: false; readonly error: 'invalid_request'; readonly message: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function isCrmProjectsListV2PageSize(value: unknown): value is CrmProjectsListV2PageSize {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (CRM_PROJECTS_LIST_V2_PAGE_SIZES as readonly number[]).includes(value)
  );
}

export function parseCrmProjectsListV2PageSize(
  value: unknown,
  fallback: CrmProjectsListV2PageSize = CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE
): CrmProjectsListV2PageSize {
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (isCrmProjectsListV2PageSize(n)) return n;
  }
  if (isCrmProjectsListV2PageSize(value)) return value;
  return fallback;
}

export function normalizeCrmProjectsListV2Search(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLocaleLowerCase();
  if (trimmed.length < CRM_PROJECTS_LIST_V2_SEARCH_MIN_LENGTH) return null;
  return trimmed;
}

function normalizeStageSlugs(raw: unknown): readonly PipelineStageSlug[] | { error: string } {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return { error: 'filters.stageSlugs must be an array' };
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { error: 'filters.stageSlugs entries must be non-empty strings' };
    }
    out.push(entry.trim());
  }
  return uniqueSortedStrings(out) as PipelineStageSlug[];
}

function normalizePriorities(raw: unknown): readonly CrmPriority[] | { error: string } {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return { error: 'filters.priorities must be an array' };
  const out: CrmPriorityFilterValue[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !(CRM_PRIORITY_FILTER_VALUES as readonly string[]).includes(entry)) {
      return { error: 'filters.priorities entries must be normal or urgent' };
    }
    out.push(entry as CrmPriorityFilterValue);
  }
  return uniqueSortedStrings(out) as CrmPriority[];
}

function normalizeWorkflowTaskStatuses(
  raw: unknown
): readonly WorkflowTaskStatus[] | { error: string } {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return { error: 'filters.workflowTaskStatuses must be an array' };
  const out: WorkflowTaskStatus[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !isWorkflowTaskStatus(entry)) {
      return { error: 'filters.workflowTaskStatuses contains an unsupported status' };
    }
    out.push(entry);
  }
  return uniqueSortedStrings(out) as WorkflowTaskStatus[];
}

function normalizeAssignedMemberIds(raw: unknown): readonly string[] | { error: string } {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return { error: 'filters.assignedMemberIds must be an array' };
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { error: 'filters.assignedMemberIds entries must be non-empty strings' };
    }
    const id = entry.trim();
    if (id !== CRM_LIST_FILTER_UNASSIGNED_ASSIGNEE_ID && !isUuid(id)) {
      return { error: 'filters.assignedMemberIds entries must be UUIDs or __unassigned__' };
    }
    out.push(id);
  }
  return uniqueSortedStrings(out);
}

function normalizeProjectStatuses(raw: unknown): readonly CrmProjectStatus[] | { error: string } {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return { error: 'filters.projectStatuses must be an array' };
  const out: CrmProjectStatus[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !isCrmProjectStatus(entry)) {
      return { error: 'filters.projectStatuses contains an unsupported status' };
    }
    out.push(entry);
  }
  return uniqueSortedStrings(out) as CrmProjectStatus[];
}

export function buildCrmProjectsListV2Fingerprint(input: {
  readonly view: CrmProjectsListV2View;
  readonly parentProjectId: string | null;
  readonly search: string | null;
  readonly filters: CrmProjectsListV2Filters;
  readonly sort: CrmProjectsListV2SortMode;
  readonly limit: CrmProjectsListV2PageSize;
}): string {
  const canonical = {
    view: input.view,
    parentProjectId: input.parentProjectId,
    search: input.search,
    filters: {
      stageSlugs: [...input.filters.stageSlugs],
      priorities: [...input.filters.priorities],
      workflowTaskStatuses: [...input.filters.workflowTaskStatuses],
      assignedMemberIds: [...input.filters.assignedMemberIds],
      projectStatuses: [...input.filters.projectStatuses],
    },
    sort: input.sort,
    limit: input.limit,
  };
  return encodeCrmProjectsListV2FingerprintCanonical(JSON.stringify(canonical));
}

export function normalizeCrmProjectsListV2Request(
  input: NormalizeCrmProjectsListV2RequestInput
): NormalizeCrmProjectsListV2RequestResult {
  const viewRaw = typeof input.view === 'string' ? input.view.trim() : 'roots';
  if (!(CRM_PROJECTS_LIST_V2_VIEWS as readonly string[]).includes(viewRaw)) {
    return { ok: false, error: 'invalid_request', message: 'Unsupported list view' };
  }
  const view = viewRaw as CrmProjectsListV2View;

  let parentProjectId: string | null = null;
  if (view === 'children_of_parent') {
    if (typeof input.parentProjectId !== 'string' || !isUuid(input.parentProjectId.trim())) {
      return {
        ok: false,
        error: 'invalid_request',
        message: 'parentProjectId UUID is required for children_of_parent',
      };
    }
    parentProjectId = input.parentProjectId.trim().toLowerCase();
  } else if (input.parentProjectId != null && input.parentProjectId !== '') {
    return {
      ok: false,
      error: 'invalid_request',
      message: 'parentProjectId is only valid for children_of_parent',
    };
  }

  const sortRaw =
    typeof input.sort === 'string' && input.sort.trim()
      ? input.sort.trim()
      : CRM_PROJECTS_LIST_V2_DEFAULT_SORT;
  if (!(CRM_PROJECTS_LIST_V2_SORT_MODES as readonly string[]).includes(sortRaw)) {
    return { ok: false, error: 'invalid_request', message: 'Unsupported sort mode' };
  }
  const sort = sortRaw as CrmProjectsListV2SortMode;

  const limitParsed =
    typeof input.limit === 'string' || typeof input.limit === 'number'
      ? Number(input.limit)
      : CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE;
  if (!isCrmProjectsListV2PageSize(limitParsed)) {
    return {
      ok: false,
      error: 'invalid_request',
      message: `limit must be one of ${CRM_PROJECTS_LIST_V2_PAGE_SIZES.join(', ')}`,
    };
  }
  const limit = limitParsed;

  const stageSlugs = normalizeStageSlugs(input.filters?.stageSlugs);
  if ('error' in stageSlugs) {
    return { ok: false, error: 'invalid_request', message: stageSlugs.error };
  }
  const priorities = normalizePriorities(input.filters?.priorities);
  if ('error' in priorities) {
    return { ok: false, error: 'invalid_request', message: priorities.error };
  }
  const workflowTaskStatuses = normalizeWorkflowTaskStatuses(input.filters?.workflowTaskStatuses);
  if ('error' in workflowTaskStatuses) {
    return { ok: false, error: 'invalid_request', message: workflowTaskStatuses.error };
  }
  const assignedMemberIds = normalizeAssignedMemberIds(input.filters?.assignedMemberIds);
  if ('error' in assignedMemberIds) {
    return { ok: false, error: 'invalid_request', message: assignedMemberIds.error };
  }
  const projectStatuses = normalizeProjectStatuses(input.filters?.projectStatuses);
  if ('error' in projectStatuses) {
    return { ok: false, error: 'invalid_request', message: projectStatuses.error };
  }

  const filters: CrmProjectsListV2Filters = {
    stageSlugs,
    priorities,
    workflowTaskStatuses,
    assignedMemberIds,
    projectStatuses,
  };
  const search = normalizeCrmProjectsListV2Search(input.search);
  const fingerprint = buildCrmProjectsListV2Fingerprint({
    view,
    parentProjectId,
    search,
    filters,
    sort,
    limit,
  });

  return {
    ok: true,
    request: {
      view,
      parentProjectId,
      search,
      filters,
      sort,
      limit,
      fingerprint,
    },
  };
}
