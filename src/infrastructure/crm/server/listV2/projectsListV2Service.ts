/**
 * Projects/Subprojects list v2 service.
 * Phase 1A: root Projects page + count via Postgres RPC (keyset, no OFFSET).
 * Phase 2A: parent-scoped Subprojects page + count via Postgres RPC.
 */

import type { CrmProjectSummary } from '@/domain/crm';
import type {
  CrmProjectsListV2CountResponse,
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2PageResponse,
  CrmProjectsListV2PageSummariesResponse,
  CrmProjectsListV2RootListItem,
} from '@/domain/crm/projectsListV2';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import type { SupabaseClient } from '@supabase/supabase-js';
import { scopeProjectSummariesForMember } from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import { listCrmProjectSummariesByIdsForOrg } from '../crmReadService';
import { ensureOrganizationPipelineStages } from '../pipelineStageService';
import {
  decodeCrmProjectsListV2Cursor,
  encodeCrmProjectsListV2Cursor,
  CrmProjectsListV2InvalidCursorError,
} from './projectsListCursorCodec';
import { CrmProjectsListV2InvalidRequestError } from './projectsListV2Errors';
import {
  activeFilterNamesFromRequest,
  logCrmProjectsListV2Event,
} from './projectsListV2Observability';
import { buildCrmProjectsListV2SearchParams } from './projectsListV2Search';
import {
  operationalCursorValuesFromRow,
  parseOperationalCursorValues,
} from './projectsListV2Keyset';
import { resolveCrmProjectsListV2VisibilityRpcParams } from './projectsListV2VisibilityParams';
import { loadCrmProjectsPageSummariesForIds } from './projectsListV2PageSummaries';

export {
  CrmProjectsListV2InvalidRequestError,
  CrmProjectsListV2NotWiredError,
} from './projectsListV2Errors';

export type CrmProjectsListV2ListContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly cursor?: string | null;
  readonly signal?: AbortSignal;
};

export type CrmProjectsListV2CountContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly signal?: AbortSignal;
};

export type CrmProjectsListV2SummariesContext = {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectIds: readonly string[];
  readonly signal?: AbortSignal;
};

type RpcRootPageRow = {
  readonly id: string;
  readonly list_sort_bucket: number;
  readonly last_activity_at: string | null;
  readonly child_count: number;
};

type RpcChildPageRow = {
  readonly id: string;
  readonly list_sort_bucket: number;
  readonly last_activity_at: string | null;
};

function assertRootsRequest(request: CrmProjectsListV2NormalizedRequest): void {
  if (request.view !== 'roots') {
    throw new CrmProjectsListV2InvalidRequestError('Phase 1A supports view=roots only');
  }
  if (request.parentProjectId != null) {
    throw new CrmProjectsListV2InvalidRequestError('parentProjectId is not valid for roots');
  }
}

function assertChildrenRequest(request: CrmProjectsListV2NormalizedRequest): string {
  if (request.view !== 'children_of_parent') {
    throw new CrmProjectsListV2InvalidRequestError(
      'Phase 2A child list requires view=children_of_parent'
    );
  }
  if (request.parentProjectId == null || request.parentProjectId.trim() === '') {
    throw new CrmProjectsListV2InvalidRequestError(
      'parentProjectId is required for children_of_parent'
    );
  }
  return request.parentProjectId;
}

async function assertStageSlugsAllowedForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  stageSlugs: readonly string[]
): Promise<void> {
  if (stageSlugs.length === 0) return;

  await ensureOrganizationPipelineStages(supabase, organizationId);
  const [projectRows, subprojectRows] = await Promise.all([
    supabase
      .from('crm_pipeline_stages')
      .select('slug')
      .eq('organization_id', organizationId)
      .eq('stage_scope', 'project')
      .eq('is_active', true),
    supabase
      .from('crm_pipeline_stages')
      .select('slug')
      .eq('organization_id', organizationId)
      .eq('stage_scope', 'subproject')
      .eq('is_active', true),
  ]);
  if (projectRows.error) throw new Error(projectRows.error.message);
  if (subprojectRows.error) throw new Error(subprojectRows.error.message);

  const allowed = new Set<string>([CRM_PROJECT_COMPLETE_STAGE_SLUG]);
  for (const row of (projectRows.data ?? []) as readonly { slug: string }[]) {
    allowed.add(row.slug);
  }
  for (const row of (subprojectRows.data ?? []) as readonly { slug: string }[]) {
    allowed.add(row.slug);
  }

  for (const slug of stageSlugs) {
    if (!allowed.has(slug)) {
      throw new CrmProjectsListV2InvalidRequestError(`Unknown stage filter: ${slug}`);
    }
  }
}

function emptyArrayOrNull<T>(values: readonly T[]): T[] | null {
  return values.length === 0 ? null : [...values];
}

async function callRootPageRpc(
  supabase: SupabaseClient,
  args: {
    readonly organizationId: string;
    readonly userId: string;
    readonly visibility: Awaited<ReturnType<typeof resolveCrmProjectsListV2VisibilityRpcParams>>;
    readonly request: CrmProjectsListV2NormalizedRequest;
    readonly fetchLimit: number;
    readonly direction: 'forward' | 'backward';
    readonly cursorBucket: number | null;
    readonly cursorActivity: string | null;
    readonly cursorId: string | null;
  }
): Promise<readonly RpcRootPageRow[]> {
  const search = buildCrmProjectsListV2SearchParams(args.request.search);
  const { data, error } = await supabase.rpc('crm_list_root_projects_page_v2', {
    p_organization_id: args.organizationId,
    p_viewer_user_id: args.userId,
    p_restrict_member_visibility: args.visibility.restrictMemberVisibility,
    p_only_assigned_workflow: args.visibility.onlyAssignedWorkflow,
    p_only_assigned_payments: args.visibility.onlyAssignedPayments,
    p_include_payments: args.visibility.includePayments,
    p_member_role_user_ids: [...args.visibility.memberRoleUserIds],
    p_search_prefix: search.searchPrefix,
    p_search_email: search.searchEmail,
    p_search_phone: search.searchPhone,
    p_stage_slugs: emptyArrayOrNull(args.request.filters.stageSlugs),
    p_priorities: emptyArrayOrNull(args.request.filters.priorities),
    p_workflow_statuses: emptyArrayOrNull(args.request.filters.workflowTaskStatuses),
    p_limit: args.fetchLimit,
    p_direction: args.direction,
    p_cursor_bucket: args.cursorBucket,
    p_cursor_activity: args.cursorActivity,
    p_cursor_id: args.cursorId,
  });

  if (error != null) {
    throw new Error(`crm_list_root_projects_page_v2_failed: ${error.message}`);
  }

  return ((data ?? []) as RpcRootPageRow[]).map((row) => ({
    id: row.id,
    list_sort_bucket: Number(row.list_sort_bucket),
    last_activity_at: row.last_activity_at,
    child_count: Number(row.child_count ?? 0),
  }));
}

async function callChildPageRpc(
  supabase: SupabaseClient,
  args: {
    readonly organizationId: string;
    readonly parentProjectId: string;
    readonly userId: string;
    readonly visibility: Awaited<ReturnType<typeof resolveCrmProjectsListV2VisibilityRpcParams>>;
    readonly request: CrmProjectsListV2NormalizedRequest;
    readonly fetchLimit: number;
    readonly direction: 'forward' | 'backward';
    readonly cursorBucket: number | null;
    readonly cursorActivity: string | null;
    readonly cursorId: string | null;
  }
): Promise<readonly RpcChildPageRow[]> {
  const search = buildCrmProjectsListV2SearchParams(args.request.search);
  const { data, error } = await supabase.rpc('crm_list_child_projects_page_v2', {
    p_organization_id: args.organizationId,
    p_parent_project_id: args.parentProjectId,
    p_viewer_user_id: args.userId,
    p_restrict_member_visibility: args.visibility.restrictMemberVisibility,
    p_only_assigned_workflow: args.visibility.onlyAssignedWorkflow,
    p_only_assigned_payments: args.visibility.onlyAssignedPayments,
    p_include_payments: args.visibility.includePayments,
    p_member_role_user_ids: [...args.visibility.memberRoleUserIds],
    p_search_prefix: search.searchPrefix,
    p_search_email: search.searchEmail,
    p_search_phone: search.searchPhone,
    p_stage_slugs: emptyArrayOrNull(args.request.filters.stageSlugs),
    p_priorities: emptyArrayOrNull(args.request.filters.priorities),
    p_workflow_statuses: emptyArrayOrNull(args.request.filters.workflowTaskStatuses),
    p_limit: args.fetchLimit,
    p_direction: args.direction,
    p_cursor_bucket: args.cursorBucket,
    p_cursor_activity: args.cursorActivity,
    p_cursor_id: args.cursorId,
  });

  if (error != null) {
    throw new Error(`crm_list_child_projects_page_v2_failed: ${error.message}`);
  }

  return ((data ?? []) as RpcChildPageRow[]).map((row) => ({
    id: row.id,
    list_sort_bucket: Number(row.list_sort_bucket),
    last_activity_at: row.last_activity_at,
  }));
}

async function callChildCountRpc(
  supabase: SupabaseClient,
  args: {
    readonly organizationId: string;
    readonly parentProjectId: string;
    readonly userId: string;
    readonly visibility: Awaited<ReturnType<typeof resolveCrmProjectsListV2VisibilityRpcParams>>;
    readonly request: CrmProjectsListV2NormalizedRequest;
  }
): Promise<number> {
  const search = buildCrmProjectsListV2SearchParams(args.request.search);
  const { data, error } = await supabase.rpc('crm_count_child_projects_v2', {
    p_organization_id: args.organizationId,
    p_parent_project_id: args.parentProjectId,
    p_viewer_user_id: args.userId,
    p_restrict_member_visibility: args.visibility.restrictMemberVisibility,
    p_only_assigned_workflow: args.visibility.onlyAssignedWorkflow,
    p_only_assigned_payments: args.visibility.onlyAssignedPayments,
    p_include_payments: args.visibility.includePayments,
    p_member_role_user_ids: [...args.visibility.memberRoleUserIds],
    p_search_prefix: search.searchPrefix,
    p_search_email: search.searchEmail,
    p_search_phone: search.searchPhone,
    p_stage_slugs: emptyArrayOrNull(args.request.filters.stageSlugs),
    p_priorities: emptyArrayOrNull(args.request.filters.priorities),
    p_workflow_statuses: emptyArrayOrNull(args.request.filters.workflowTaskStatuses),
  });

  if (error != null) {
    throw new Error(`crm_count_child_projects_v2_failed: ${error.message}`);
  }

  const count = typeof data === 'number' ? data : Number(data ?? 0);
  if (!Number.isFinite(count) || count < 0) {
    throw new Error('crm_count_child_projects_v2_failed: invalid count');
  }
  return Math.trunc(count);
}

async function callRootCountRpc(
  supabase: SupabaseClient,
  args: {
    readonly organizationId: string;
    readonly userId: string;
    readonly visibility: Awaited<ReturnType<typeof resolveCrmProjectsListV2VisibilityRpcParams>>;
    readonly request: CrmProjectsListV2NormalizedRequest;
  }
): Promise<number> {
  const search = buildCrmProjectsListV2SearchParams(args.request.search);
  const { data, error } = await supabase.rpc('crm_count_root_projects_v2', {
    p_organization_id: args.organizationId,
    p_viewer_user_id: args.userId,
    p_restrict_member_visibility: args.visibility.restrictMemberVisibility,
    p_only_assigned_workflow: args.visibility.onlyAssignedWorkflow,
    p_only_assigned_payments: args.visibility.onlyAssignedPayments,
    p_include_payments: args.visibility.includePayments,
    p_member_role_user_ids: [...args.visibility.memberRoleUserIds],
    p_search_prefix: search.searchPrefix,
    p_search_email: search.searchEmail,
    p_search_phone: search.searchPhone,
    p_stage_slugs: emptyArrayOrNull(args.request.filters.stageSlugs),
    p_priorities: emptyArrayOrNull(args.request.filters.priorities),
    p_workflow_statuses: emptyArrayOrNull(args.request.filters.workflowTaskStatuses),
  });

  if (error != null) {
    throw new Error(`crm_count_root_projects_v2_failed: ${error.message}`);
  }

  const count = typeof data === 'number' ? data : Number(data ?? 0);
  if (!Number.isFinite(count) || count < 0) {
    throw new Error('crm_count_root_projects_v2_failed: invalid count');
  }
  return Math.trunc(count);
}

function applyMemberMasking(
  summaries: readonly CrmProjectSummary[],
  memberScope: Awaited<
    ReturnType<typeof resolveCrmProjectsListV2VisibilityRpcParams>
  >['memberScope']
): readonly CrmProjectSummary[] {
  if (memberScope == null) return summaries;
  return scopeProjectSummariesForMember(summaries, memberScope);
}

/**
 * Paginated root Projects (dashboard).
 */
export async function listCrmRootProjectsPageV2(
  context: CrmProjectsListV2ListContext
): Promise<CrmProjectsListV2PageResponse<CrmProjectsListV2RootListItem>> {
  const started = Date.now();
  assertRootsRequest(context.request);
  await assertStageSlugsAllowedForOrg(
    context.supabase,
    context.organizationId,
    context.request.filters.stageSlugs
  );

  const visibility = await resolveCrmProjectsListV2VisibilityRpcParams(
    context.supabase,
    context.organizationId,
    context.userId
  );

  let direction: 'forward' | 'backward' = 'forward';
  let cursorBucket: number | null = null;
  let cursorActivity: string | null = null;
  let cursorId: string | null = null;
  const hasIncomingCursor = Boolean(context.cursor?.trim());

  if (hasIncomingCursor && context.cursor != null) {
    const payload = await decodeCrmProjectsListV2Cursor({
      cursor: context.cursor,
      organizationId: context.organizationId,
      request: context.request,
    });
    const values = parseOperationalCursorValues(payload);
    direction = payload.direction;
    cursorBucket = values.listSortBucket;
    cursorActivity = values.lastActivityAt;
    cursorId = values.id;
  }

  const fetchLimit = context.request.limit + 1;
  let rows = await callRootPageRpc(context.supabase, {
    organizationId: context.organizationId,
    userId: context.userId,
    visibility,
    request: context.request,
    fetchLimit,
    direction,
    cursorBucket,
    cursorActivity,
    cursorId,
  });

  let hasExtra = rows.length > context.request.limit;
  if (hasExtra) {
    rows = rows.slice(0, context.request.limit);
  }

  if (direction === 'backward') {
    rows = [...rows].reverse();
  }

  const childCountById = new Map(rows.map((row) => [row.id, row.child_count] as const));
  const keysetById = new Map(
    rows.map((row) => [
      row.id,
      {
        listSortBucket: row.list_sort_bucket,
        lastActivityAt: row.last_activity_at,
        id: row.id,
      },
    ] as const)
  );

  const summaries = applyMemberMasking(
    await listCrmProjectSummariesByIdsForOrg(
      context.supabase,
      context.organizationId,
      rows.map((row) => row.id)
    ),
    visibility.memberScope
  );
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary] as const));

  // Preserve RPC order; drop only if member masking removed a row (should be rare).
  const items: CrmProjectsListV2RootListItem[] = [];
  for (const row of rows) {
    const summary = summaryById.get(row.id);
    if (summary == null) continue;
    items.push({
      ...summary,
      childCount: childCountById.get(row.id) ?? 0,
    });
  }

  const first = items[0] != null ? keysetById.get(items[0].id) : null;
  const last = items.length > 0 ? keysetById.get(items[items.length - 1]!.id) : null;

  let hasNextPage = false;
  let hasPreviousPage = false;
  if (direction === 'forward') {
    hasNextPage = hasExtra;
    hasPreviousPage = hasIncomingCursor;
  } else {
    hasPreviousPage = hasExtra;
    hasNextPage = hasIncomingCursor;
  }

  const nextCursor =
    hasNextPage && last != null
      ? await encodeCrmProjectsListV2Cursor({
          organizationId: context.organizationId,
          request: context.request,
          direction: 'forward',
          values: operationalCursorValuesFromRow(last),
          id: last.id,
        })
      : null;

  const previousCursor =
    hasPreviousPage && first != null
      ? await encodeCrmProjectsListV2Cursor({
          organizationId: context.organizationId,
          request: context.request,
          direction: 'backward',
          values: operationalCursorValuesFromRow(first),
          id: first.id,
        })
      : null;

  const response: CrmProjectsListV2PageResponse<CrmProjectsListV2RootListItem> = {
    items,
    pageInfo: {
      nextCursor,
      previousCursor,
      hasNextPage,
      hasPreviousPage,
    },
    query: {
      view: context.request.view,
      sort: context.request.sort,
    },
    meta: { apiVersion: 2 },
  };

  logCrmProjectsListV2Event({
    name: 'crm.projects_list_v2.query',
    durationMs: Date.now() - started,
    rowsReturned: items.length,
    requestedLimit: context.request.limit,
    view: context.request.view,
    sort: context.request.sort,
    direction: hasIncomingCursor ? direction : 'first',
    activeFilters: activeFilterNamesFromRequest(context.request),
  });

  if (items.length === 0) {
    logCrmProjectsListV2Event({
      name: 'crm.projects_list_v2.empty_page',
      view: context.request.view,
      sort: context.request.sort,
    });
  }

  return response;
}

/**
 * Paginated direct Subprojects for one parent Project (Phase 2A).
 */
export async function listCrmChildProjectsPageV2(
  context: CrmProjectsListV2ListContext
): Promise<CrmProjectsListV2PageResponse<CrmProjectSummary>> {
  const started = Date.now();
  const parentProjectId = assertChildrenRequest(context.request);
  await assertStageSlugsAllowedForOrg(
    context.supabase,
    context.organizationId,
    context.request.filters.stageSlugs
  );

  const visibility = await resolveCrmProjectsListV2VisibilityRpcParams(
    context.supabase,
    context.organizationId,
    context.userId
  );

  let direction: 'forward' | 'backward' = 'forward';
  let cursorBucket: number | null = null;
  let cursorActivity: string | null = null;
  let cursorId: string | null = null;
  const hasIncomingCursor = Boolean(context.cursor?.trim());

  if (hasIncomingCursor && context.cursor != null) {
    const payload = await decodeCrmProjectsListV2Cursor({
      cursor: context.cursor,
      organizationId: context.organizationId,
      request: context.request,
    });
    const values = parseOperationalCursorValues(payload);
    direction = payload.direction;
    cursorBucket = values.listSortBucket;
    cursorActivity = values.lastActivityAt;
    cursorId = values.id;
  }

  const fetchLimit = context.request.limit + 1;
  let rows = await callChildPageRpc(context.supabase, {
    organizationId: context.organizationId,
    parentProjectId,
    userId: context.userId,
    visibility,
    request: context.request,
    fetchLimit,
    direction,
    cursorBucket,
    cursorActivity,
    cursorId,
  });

  let hasExtra = rows.length > context.request.limit;
  if (hasExtra) {
    rows = rows.slice(0, context.request.limit);
  }

  if (direction === 'backward') {
    rows = [...rows].reverse();
  }

  const keysetById = new Map(
    rows.map((row) => [
      row.id,
      {
        listSortBucket: row.list_sort_bucket,
        lastActivityAt: row.last_activity_at,
        id: row.id,
      },
    ] as const)
  );

  const summaries = applyMemberMasking(
    await listCrmProjectSummariesByIdsForOrg(
      context.supabase,
      context.organizationId,
      rows.map((row) => row.id)
    ),
    visibility.memberScope
  );
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary] as const));

  const items: CrmProjectSummary[] = [];
  for (const row of rows) {
    const summary = summaryById.get(row.id);
    if (summary == null) continue;
    // Defense in depth: never return a row from another parent.
    if (summary.parentProjectId !== parentProjectId) continue;
    items.push(summary);
  }

  const first = items[0] != null ? keysetById.get(items[0].id) : null;
  const last = items.length > 0 ? keysetById.get(items[items.length - 1]!.id) : null;

  let hasNextPage = false;
  let hasPreviousPage = false;
  if (direction === 'forward') {
    hasNextPage = hasExtra;
    hasPreviousPage = hasIncomingCursor;
  } else {
    hasPreviousPage = hasExtra;
    hasNextPage = hasIncomingCursor;
  }

  const nextCursor =
    hasNextPage && last != null
      ? await encodeCrmProjectsListV2Cursor({
          organizationId: context.organizationId,
          request: context.request,
          direction: 'forward',
          values: operationalCursorValuesFromRow(last),
          id: last.id,
        })
      : null;

  const previousCursor =
    hasPreviousPage && first != null
      ? await encodeCrmProjectsListV2Cursor({
          organizationId: context.organizationId,
          request: context.request,
          direction: 'backward',
          values: operationalCursorValuesFromRow(first),
          id: first.id,
        })
      : null;

  const response: CrmProjectsListV2PageResponse<CrmProjectSummary> = {
    items,
    pageInfo: {
      nextCursor,
      previousCursor,
      hasNextPage,
      hasPreviousPage,
    },
    query: {
      view: context.request.view,
      sort: context.request.sort,
    },
    meta: { apiVersion: 2 },
  };

  logCrmProjectsListV2Event({
    name: 'crm.projects_list_v2.query',
    durationMs: Date.now() - started,
    rowsReturned: items.length,
    requestedLimit: context.request.limit,
    view: context.request.view,
    sort: context.request.sort,
    direction: hasIncomingCursor ? direction : 'first',
    activeFilters: activeFilterNamesFromRequest(context.request),
  });

  if (items.length === 0) {
    logCrmProjectsListV2Event({
      name: 'crm.projects_list_v2.empty_page',
      view: context.request.view,
      sort: context.request.sort,
    });
  }

  return response;
}

/**
 * Filtered count for the same normalized request (independent of page).
 * Supports roots (Phase 1A) and children_of_parent (Phase 2A).
 */
export async function countCrmProjectsListV2(
  context: CrmProjectsListV2CountContext
): Promise<CrmProjectsListV2CountResponse> {
  const started = Date.now();
  await assertStageSlugsAllowedForOrg(
    context.supabase,
    context.organizationId,
    context.request.filters.stageSlugs
  );

  const visibility = await resolveCrmProjectsListV2VisibilityRpcParams(
    context.supabase,
    context.organizationId,
    context.userId
  );

  let totalCount: number;
  if (context.request.view === 'children_of_parent') {
    const parentProjectId = assertChildrenRequest(context.request);
    totalCount = await callChildCountRpc(context.supabase, {
      organizationId: context.organizationId,
      parentProjectId,
      userId: context.userId,
      visibility,
      request: context.request,
    });
  } else {
    assertRootsRequest(context.request);
    totalCount = await callRootCountRpc(context.supabase, {
      organizationId: context.organizationId,
      userId: context.userId,
      visibility,
      request: context.request,
    });
  }

  logCrmProjectsListV2Event({
    name: 'crm.projects_list_v2.count',
    durationMs: Date.now() - started,
    rowsReturned: totalCount,
    view: context.request.view,
    sort: context.request.sort,
    activeFilters: activeFilterNamesFromRequest(context.request),
  });

  return {
    totalCount,
    query: {
      view: context.request.view,
      sort: context.request.sort,
      fingerprint: context.request.fingerprint,
    },
    meta: { apiVersion: 2 },
  };
}

/**
 * Page-scoped rollup summaries for visible project IDs only (never org-wide).
 */
export async function loadCrmProjectsPageSummariesV2(
  context: CrmProjectsListV2SummariesContext
): Promise<CrmProjectsListV2PageSummariesResponse> {
  return loadCrmProjectsPageSummariesForIds({
    supabase: context.supabase,
    organizationId: context.organizationId,
    userId: context.userId,
    projectIds: context.projectIds,
  });
}

export { CrmProjectsListV2InvalidCursorError };
