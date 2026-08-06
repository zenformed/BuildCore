/**
 * Accountability list v2 — project-scoped keyset page.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PipelineStageSlug } from '@/domain/crm';
import type {
  CrmAccountabilityListItem,
  CrmAccountabilityListV2NormalizedRequest,
  CrmAccountabilityListV2PageResponse,
} from '@/domain/crm/accountabilityListV2';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { loadActiveOrganizationMemberRole } from '../buildCoreWorkflowTaskVisibilityService';
import { getCrmProjectSummaryBySlugForOrg } from '../crmReadService';
import { memberCanAccessProjectIdForViewer } from '../crmMemberProjectVisibilityService';
import { loadCrmMemberMap } from '../crmMemberMap';
import {
  CrmAccountabilityListV2InvalidCursorError,
  decodeCrmAccountabilityListV2Cursor,
  encodeCrmAccountabilityListV2Cursor,
  parseAccountabilityCursorValues,
} from './accountabilityListCursorCodec';
import { logCrmAccountabilityListV2Event } from './accountabilityListV2Observability';

export class CrmAccountabilityListV2ForbiddenError extends Error {
  readonly code = 'forbidden';
  constructor(message = 'Accountability is not available') {
    super(message);
    this.name = 'CrmAccountabilityListV2ForbiddenError';
  }
}

export class CrmAccountabilityListV2NotFoundError extends Error {
  readonly code = 'not_found';
  constructor(message = 'Project not found') {
    super(message);
    this.name = 'CrmAccountabilityListV2NotFoundError';
  }
}

export class CrmAccountabilityListV2InvalidRequestError extends Error {
  readonly code = 'invalid_request';
  constructor(message: string) {
    super(message);
    this.name = 'CrmAccountabilityListV2InvalidRequestError';
  }
}

type RpcPageRow = {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
  actor_member_id: string;
  workflow_task_id: string | null;
};

export async function resolveAccessibleProjectForAccountabilityListV2(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectSlug: string
): Promise<{ readonly id: string; readonly slug: string }> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (isBuildCoreMemberRole(actorRole)) {
    // Same product rule as folder tabs / route layout: members cannot access Accountability.
    throw new CrmAccountabilityListV2ForbiddenError();
  }

  const summary = await getCrmProjectSummaryBySlugForOrg(supabase, organizationId, projectSlug);
  if (summary == null) {
    throw new CrmAccountabilityListV2NotFoundError();
  }

  const canAccess = await memberCanAccessProjectIdForViewer(
    supabase,
    organizationId,
    userId,
    summary.id
  );
  if (!canAccess) {
    throw new CrmAccountabilityListV2NotFoundError();
  }

  return { id: summary.id, slug: summary.slug };
}

async function loadStageSlugByTaskId(
  supabase: SupabaseClient,
  projectId: string,
  taskIds: readonly string[]
): Promise<Map<string, PipelineStageSlug>> {
  const map = new Map<string, PipelineStageSlug>();
  if (taskIds.length === 0) return map;
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('id, stage_slug')
    .eq('project_id', projectId)
    .in('id', [...taskIds]);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as readonly { id: string; stage_slug: string }[]) {
    map.set(row.id, row.stage_slug as PipelineStageSlug);
  }
  return map;
}

export async function listCrmAccountabilityPageV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly request: CrmAccountabilityListV2NormalizedRequest;
  readonly cursor: string | null;
}): Promise<CrmAccountabilityListV2PageResponse> {
  const started = Date.now();
  if (input.request.projectId !== input.projectId) {
    throw new CrmAccountabilityListV2InvalidRequestError('projectId mismatch');
  }

  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;
  const hasIncomingCursor = Boolean(input.cursor?.trim());

  if (hasIncomingCursor && input.cursor != null) {
    const payload = await decodeCrmAccountabilityListV2Cursor({
      cursor: input.cursor,
      organizationId: input.organizationId,
      request: input.request,
    });
    const values = parseAccountabilityCursorValues(payload);
    cursorCreatedAt = values.createdAt;
    cursorId = values.id;
  }

  const fetchLimit = input.request.limit + 1;
  const { data, error } = await input.supabase.rpc('crm_list_accountability_events_page_v2', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_search_prefix: input.request.search,
    p_limit: fetchLimit,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_id: cursorId,
  });

  if (error != null) {
    throw new Error(`crm_list_accountability_events_page_v2_failed: ${error.message}`);
  }

  let rows = (data ?? []) as RpcPageRow[];
  const hasExtra = rows.length > input.request.limit;
  if (hasExtra) {
    rows = rows.slice(0, input.request.limit);
  }

  const memberById = await loadCrmMemberMap(
    input.supabase,
    rows.map((row) => row.actor_member_id),
    { organizationId: input.organizationId }
  );
  const stageByTaskId = await loadStageSlugByTaskId(
    input.supabase,
    input.projectId,
    rows
      .map((row) => row.workflow_task_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  );

  const items: CrmAccountabilityListItem[] = rows.map((row) => ({
    id: row.id,
    at: row.created_at,
    actor: memberById.get(row.actor_member_id) ?? {
      id: row.actor_member_id,
      displayName: `Member ${row.actor_member_id.slice(0, 8)}`,
      initials: row.actor_member_id.slice(0, 2).toUpperCase(),
      email: null,
      avatarUrl: null,
    },
    action: row.summary,
    stageSlug:
      row.workflow_task_id != null ? (stageByTaskId.get(row.workflow_task_id) ?? null) : null,
    eventType: row.event_type,
  }));

  const last = items[items.length - 1] ?? null;
  const nextCursor =
    hasExtra && last != null
      ? await encodeCrmAccountabilityListV2Cursor({
          organizationId: input.organizationId,
          request: input.request,
          direction: 'forward',
          values: [last.at, last.id],
          id: last.id,
        })
      : null;

  logCrmAccountabilityListV2Event({
    name: 'crm.accountability_list_v2.query',
    durationMs: Date.now() - started,
    rowsReturned: items.length,
    requestedLimit: input.request.limit,
    direction: hasIncomingCursor ? 'forward' : 'first',
    searchActive: input.request.search != null,
  });

  if (items.length === 0) {
    logCrmAccountabilityListV2Event({ name: 'crm.accountability_list_v2.empty_page' });
  }

  return {
    items,
    pageInfo: {
      nextCursor,
      hasNextPage: hasExtra,
    },
    query: {
      search: input.request.search,
      fingerprint: input.request.fingerprint,
    },
    meta: { apiVersion: 2 },
  };
}

export async function hasNewerCrmAccountabilityV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly projectId: string;
  readonly afterCreatedAt: string;
  readonly afterId: string;
}): Promise<boolean> {
  const { data, error } = await input.supabase.rpc('crm_accountability_has_newer_v2', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_after_created_at: input.afterCreatedAt,
    p_after_id: input.afterId,
  });
  if (error != null) {
    throw new Error(`crm_accountability_has_newer_v2_failed: ${error.message}`);
  }
  return Boolean(data);
}

export { CrmAccountabilityListV2InvalidCursorError };
