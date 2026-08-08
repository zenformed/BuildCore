/**
 * Documents list v2 — project-scoped keyset page for Project/Subproject Documents tab.
 * Includes all MIME types (same as today's Documents tab; not Photos-filtered).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import type { CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import type {
  CrmDocumentListItemV2,
  CrmDocumentsListV2NormalizedRequest,
  CrmDocumentsListV2PageResponse,
} from '@/domain/crm/documentsListV2';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { filterWorkflowTasksForBuildCoreMember } from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  mapDbDocument,
  type DbCrmDocumentRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmDocumentThumbnailSignedUrls } from '../crmDocumentThumbnailSignedUrls';
import { loadActiveOrganizationMemberRole } from '../buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from '../buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from '../buildCoreRoleAccessService';
import { getCrmProjectSummaryBySlugForOrg } from '../crmReadService';
import { memberCanAccessProjectIdForViewer } from '../crmMemberProjectVisibilityService';
import { loadCrmMemberMap } from '../crmMemberMap';
import {
  CrmDocumentsListV2InvalidCursorError,
  decodeCrmDocumentsListV2Cursor,
  encodeCrmDocumentsListV2Cursor,
  parseDocumentsCursorValues,
} from './documentsListCursorCodec';
import { logCrmDocumentsListV2Event } from './documentsListV2Observability';

export class CrmDocumentsListV2NotFoundError extends Error {
  readonly code = 'not_found';
  constructor(message = 'Project not found') {
    super(message);
    this.name = 'CrmDocumentsListV2NotFoundError';
  }
}

export class CrmDocumentsListV2InvalidRequestError extends Error {
  readonly code = 'invalid_request';
  constructor(message: string) {
    super(message);
    this.name = 'CrmDocumentsListV2InvalidRequestError';
  }
}

type MemberVisibilityParams = {
  readonly restrictMemberVisibility: boolean;
  readonly allowedWorkflowTaskIds: readonly string[];
  readonly allowBudgetDocuments: boolean;
  readonly allowProjectMedia: boolean;
};

export async function resolveAccessibleProjectForDocumentsListV2(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectSlug: string
): Promise<{ readonly id: string; readonly slug: string }> {
  const summary = await getCrmProjectSummaryBySlugForOrg(supabase, organizationId, projectSlug);
  if (summary == null) {
    throw new CrmDocumentsListV2NotFoundError();
  }

  const canAccess = await memberCanAccessProjectIdForViewer(
    supabase,
    organizationId,
    userId,
    summary.id
  );
  if (!canAccess) {
    throw new CrmDocumentsListV2NotFoundError();
  }

  return { id: summary.id, slug: summary.slug };
}

async function resolveMemberVisibilityParams(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectId: string
): Promise<MemberVisibilityParams> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return {
      restrictMemberVisibility: false,
      allowedWorkflowTaskIds: [],
      allowBudgetDocuments: true,
      allowProjectMedia: true,
    };
  }

  const [visibilityInput, paymentAccess, budgetAccess, tasksResult] = await Promise.all([
    resolveBuildCoreMemberTaskVisibilityInput(supabase, organizationId, userId),
    resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
    resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'budget'),
    supabase
      .from('crm_workflow_tasks')
      .select('id, amount_cents, assigned_member_id')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('archived_at', null),
  ]);

  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const scopeInput = {
    ...visibilityInput,
    includePaymentsAssignedToViewer: paymentAccess.canView,
    includeBudgetForViewer: budgetAccess.canView,
  };

  const lightweightTasks: CrmWorkflowTask[] = (tasksResult.data ?? []).map((row) => {
    const amount = row.amount_cents == null ? null : Number(row.amount_cents);
    const amountCents = Number.isFinite(amount as number) ? (amount as number) : null;
    return {
      id: row.id as string,
      title: '',
      stageSlug: 'new-lead' as PipelineStageSlug,
      status: 'pending',
      documentsRequired: false,
      notes: null,
      dueAt: null,
      completedAt: null,
      assignedTo:
        row.assigned_member_id != null
          ? {
              id: row.assigned_member_id as string,
              displayName: '',
              initials: '',
              email: null,
              avatarUrl: null,
            }
          : null,
      completedBy: null,
      sortOrder: 0,
      amountCents,
      invoicedAt: null,
      paidAt: null,
      customFields: {},
    };
  });

  const visibleTasks = filterWorkflowTasksForBuildCoreMember(lightweightTasks, scopeInput);

  return {
    restrictMemberVisibility: true,
    allowedWorkflowTaskIds: visibleTasks.map((task) => task.id),
    allowBudgetDocuments: budgetAccess.canView === true,
    // Members never see project-media (null task + null budget) — matches
    // applyBuildCoreMemberProjectDetailView.
    allowProjectMedia: false,
  };
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

export async function listCrmDocumentsPageV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly request: CrmDocumentsListV2NormalizedRequest;
  readonly cursor: string | null;
  readonly storage?: IDocumentStorageProvider | null;
}): Promise<CrmDocumentsListV2PageResponse> {
  const started = Date.now();
  if (input.request.projectId !== input.projectId) {
    throw new CrmDocumentsListV2InvalidRequestError('projectId mismatch');
  }

  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;
  const hasIncomingCursor = Boolean(input.cursor?.trim());

  if (hasIncomingCursor && input.cursor != null) {
    const payload = await decodeCrmDocumentsListV2Cursor({
      cursor: input.cursor,
      organizationId: input.organizationId,
      request: input.request,
    });
    const values = parseDocumentsCursorValues(payload);
    cursorCreatedAt = values.createdAt;
    cursorId = values.id;
  }

  const visibility = await resolveMemberVisibilityParams(
    input.supabase,
    input.organizationId,
    input.userId,
    input.projectId
  );

  const fetchLimit = input.request.limit + 1;
  const { data, error } = await input.supabase.rpc('crm_list_documents_page_v2', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_search_prefix: input.request.search,
    p_limit: fetchLimit,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_id: cursorId,
    p_restrict_member_visibility: visibility.restrictMemberVisibility,
    p_allowed_workflow_task_ids: [...visibility.allowedWorkflowTaskIds],
    p_allow_budget_documents: visibility.allowBudgetDocuments,
    p_allow_project_media: visibility.allowProjectMedia,
  });

  if (error != null) {
    throw new Error(`crm_list_documents_page_v2_failed: ${error.message}`);
  }

  let rows = (data ?? []) as DbCrmDocumentRow[];
  const hasExtra = rows.length > input.request.limit;
  if (hasExtra) {
    rows = rows.slice(0, input.request.limit);
  }

  const memberById = await loadCrmMemberMap(
    input.supabase,
    rows.flatMap((row) =>
      [row.uploaded_by_member_id, row.reviewed_by_member_id].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    ),
    { organizationId: input.organizationId }
  );
  const stageByTaskId = await loadStageSlugByTaskId(
    input.supabase,
    input.projectId,
    rows
      .map((row) => row.workflow_task_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  );

  const thumbnailUrlById = await loadCrmDocumentThumbnailSignedUrls({
    supabase: input.supabase,
    organizationId: input.organizationId,
    documentIds: rows.map((row) => row.id),
    storage: input.storage ?? null,
  });

  const items: CrmDocumentListItemV2[] = rows.map((row) => {
    const document = mapDbDocument(row, stageByTaskId, memberById);
    return {
      ...document,
      thumbnailUrl: thumbnailUrlById.get(document.id) ?? null,
    };
  });

  const last = items[items.length - 1] ?? null;
  const nextCursor =
    hasExtra && last != null
      ? await encodeCrmDocumentsListV2Cursor({
          organizationId: input.organizationId,
          request: input.request,
          direction: 'forward',
          values: [last.uploadedAt, last.id],
          id: last.id,
        })
      : null;

  const payloadBytesApprox = Buffer.byteLength(JSON.stringify({ items }), 'utf8');

  logCrmDocumentsListV2Event({
    name: 'crm.documents_list_v2.query',
    durationMs: Date.now() - started,
    rowsReturned: items.length,
    requestedLimit: input.request.limit,
    direction: hasIncomingCursor ? 'forward' : 'first',
    searchActive: input.request.search != null,
    payloadBytesApprox,
  });

  if (items.length === 0) {
    logCrmDocumentsListV2Event({ name: 'crm.documents_list_v2.empty_page' });
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

export async function hasNewerCrmDocumentsV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly afterCreatedAt: string;
  readonly afterId: string;
}): Promise<boolean> {
  const visibility = await resolveMemberVisibilityParams(
    input.supabase,
    input.organizationId,
    input.userId,
    input.projectId
  );
  const { data, error } = await input.supabase.rpc('crm_documents_has_newer_v2', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_after_created_at: input.afterCreatedAt,
    p_after_id: input.afterId,
    p_restrict_member_visibility: visibility.restrictMemberVisibility,
    p_allowed_workflow_task_ids: [...visibility.allowedWorkflowTaskIds],
    p_allow_budget_documents: visibility.allowBudgetDocuments,
    p_allow_project_media: visibility.allowProjectMedia,
  });
  if (error != null) {
    throw new Error(`crm_documents_has_newer_v2_failed: ${error.message}`);
  }
  return Boolean(data);
}

export { CrmDocumentsListV2InvalidCursorError };
