import type { CrmPriority } from '../project';
import type { PipelineStageSlug } from '../pipelineStage';
import type { WorkflowTaskStatus } from '../workflowTask';
import type { CrmProjectStatus } from '../projectStatus';

/** Dashboard roots vs Project-page children. */
export const CRM_PROJECTS_LIST_V2_VIEWS = ['roots', 'children_of_parent'] as const;
export type CrmProjectsListV2View = (typeof CRM_PROJECTS_LIST_V2_VIEWS)[number];

export const CRM_PROJECTS_LIST_V2_PAGE_SIZES = [25, 50, 100] as const;
export type CrmProjectsListV2PageSize = (typeof CRM_PROJECTS_LIST_V2_PAGE_SIZES)[number];

export const CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE: CrmProjectsListV2PageSize = 50;

export const CRM_PROJECTS_LIST_V2_SORT_MODES = ['operational'] as const;
export type CrmProjectsListV2SortMode = (typeof CRM_PROJECTS_LIST_V2_SORT_MODES)[number];

export const CRM_PROJECTS_LIST_V2_DEFAULT_SORT: CrmProjectsListV2SortMode = 'operational';

export const CRM_PROJECTS_LIST_V2_SEARCH_MIN_LENGTH = 2;

export const CRM_LIST_FILTER_UNASSIGNED_ASSIGNEE_ID = '__unassigned__';

/**
 * Project/Subproject status filter for list v2.
 * Empty array = All (no status predicate). Non-empty = match project_status.
 * Operational UI default is `['active']` (applied by presentation URL state).
 */
export type CrmProjectsListV2Filters = {
  readonly stageSlugs: readonly PipelineStageSlug[];
  readonly priorities: readonly CrmPriority[];
  readonly workflowTaskStatuses: readonly WorkflowTaskStatus[];
  readonly assignedMemberIds: readonly string[];
  readonly projectStatuses: readonly CrmProjectStatus[];
};

export type CrmProjectsListV2NormalizedRequest = {
  readonly view: CrmProjectsListV2View;
  /** Required when view is children_of_parent. */
  readonly parentProjectId: string | null;
  /** Normalized search; null when empty or below min length. */
  readonly search: string | null;
  readonly filters: CrmProjectsListV2Filters;
  readonly sort: CrmProjectsListV2SortMode;
  readonly limit: CrmProjectsListV2PageSize;
  /** Stable fingerprint bound into cursors. */
  readonly fingerprint: string;
};

export type CrmProjectsListV2PageInfo = {
  readonly nextCursor: string | null;
  readonly previousCursor: string | null;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
};

export type CrmProjectsListV2PageQueryMeta = {
  readonly view: CrmProjectsListV2View;
  readonly sort: CrmProjectsListV2SortMode;
};

export type CrmProjectsListV2PageMeta = {
  readonly apiVersion: 2;
};

export type CrmProjectsListV2PageResponse<T> = {
  readonly items: readonly T[];
  readonly pageInfo: CrmProjectsListV2PageInfo;
  readonly query: CrmProjectsListV2PageQueryMeta;
  readonly meta: CrmProjectsListV2PageMeta;
};

/**
 * Root Projects list v2 row: existing dashboard summary fields plus childCount
 * for the Subproject pill. Financial/progress rollups are Phase 1B (page-scoped).
 */
export type CrmProjectsListV2RootListItem = import('../project').CrmProjectSummary & {
  readonly childCount: number;
};

export type CrmProjectsListV2CountResponse = {
  readonly totalCount: number;
  readonly query: CrmProjectsListV2PageQueryMeta & {
    readonly fingerprint: string;
  };
  readonly meta: CrmProjectsListV2PageMeta;
};

/** Cursor navigation direction encoded in the signed payload. */
export type CrmProjectsListV2CursorDirection = 'forward' | 'backward';

/**
 * Decoded (pre-sign) cursor payload. Never send this shape to the browser unsigned.
 * `values` for operational sort: [listSortBucket, lastActivityAtIso | null, id].
 */
export type CrmProjectsListV2CursorPayload = {
  readonly v: 1;
  readonly kid: string;
  readonly orgId: string;
  readonly view: CrmProjectsListV2View;
  readonly parentProjectId: string | null;
  readonly sort: CrmProjectsListV2SortMode;
  readonly direction: CrmProjectsListV2CursorDirection;
  readonly fingerprint: string;
  readonly values: readonly unknown[];
  readonly id: string;
  /** Epoch milliseconds when the cursor was issued (not JWT numeric date). */
  readonly issuedAtMs: number;
};

export type CrmProjectsListV2PageSummary = {
  readonly payment: {
    readonly valueCents: number;
    readonly collectedCents: number;
    readonly balanceCents: number;
  };
  readonly progress: {
    readonly textPercent: number;
    readonly litSegmentCount: number;
  } | null;
  readonly derivedStageSlug: string | null;
  /** Non-archived child count for root rows (dashboard pill). */
  readonly childCount: number | null;
};

export type CrmProjectsListV2PageSummariesResponse = {
  readonly byProjectId: Readonly<Record<string, CrmProjectsListV2PageSummary>>;
  readonly meta: CrmProjectsListV2PageMeta;
};
