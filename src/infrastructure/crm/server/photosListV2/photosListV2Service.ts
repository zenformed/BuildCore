/**
 * Photos list v2 — organization-wide image keyset page.
 * Visibility + search applied in SQL before pagination (no overscan).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import type {
  CrmPhotoListItemV2,
  CrmPhotosListV2NormalizedRequest,
  CrmPhotosListV2PageResponse,
} from '@/domain/crm/photosListV2';
import type { PipelineStageSlug } from '@/domain/crm';
import {
  mapDbDocument,
  type DbCrmDocumentRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmDocumentThumbnailSignedUrls } from '../crmDocumentThumbnailSignedUrls';
import { loadActiveOrganizationMemberRole } from '../buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from '../buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from '../buildCoreRoleAccessService';
import { resolveBuildCoreWorkflowTaskAccessForUser } from '../buildCoreWorkflowTaskPermissionService';
import { resolveBuildCoreMemberProjectVisibilityScope } from '../crmMemberProjectVisibilityService';
import { loadCrmMemberMap } from '../crmMemberMap';
import {
  CrmPhotosListV2InvalidCursorError,
  decodeCrmPhotosListV2Cursor,
  encodeCrmPhotosListV2Cursor,
  parsePhotosCursorValues,
} from './photosListCursorCodec';
import { logCrmPhotosListV2Event } from './photosListV2Observability';

export class CrmPhotosListV2InvalidRequestError extends Error {
  readonly code = 'invalid_request';
  constructor(message: string) {
    super(message);
    this.name = 'CrmPhotosListV2InvalidRequestError';
  }
}

type PhotosVisibilityParams = {
  readonly restrictMemberVisibility: boolean;
  readonly allowedProjectIds: readonly string[];
  readonly allowBudget: boolean;
  readonly allowWorkflow: boolean;
  readonly allowPayments: boolean;
  readonly allowProjectMedia: boolean;
  readonly viewerUserId: string;
  readonly onlyAssignedWorkflow: boolean;
  readonly onlyAssignedPayments: boolean;
  readonly memberRoleUserIds: readonly string[];
  readonly actorIsMember: boolean;
  readonly workflowCanDownload: boolean;
  readonly workflowCanDelete: boolean;
  readonly paymentCanDownload: boolean;
  readonly paymentCanDelete: boolean;
  readonly budgetCanDownload: boolean;
  readonly budgetCanDelete: boolean;
};

type ProjectEnrichmentRow = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly parent_project_id: string | null;
  readonly crm_clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
  readonly crm_contacts?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

type TaskEnrichmentRow = {
  readonly id: string;
  readonly title: string;
  readonly stage_slug: string;
};

function joinedName(
  value: ProjectEnrichmentRow['crm_clients'] | ProjectEnrichmentRow['crm_contacts'],
  key: 'company_name' | 'full_name'
): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  const candidate =
    row == null
      ? null
      : key === 'company_name' && 'company_name' in row
        ? row.company_name
        : key === 'full_name' && 'full_name' in row
          ? row.full_name
          : null;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

export async function resolvePhotosListV2VisibilityParams(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<PhotosVisibilityParams> {
  const [actorRole, memberScope, workflowAccess, paymentAccess, budgetAccess] =
    await Promise.all([
      loadActiveOrganizationMemberRole(supabase, organizationId, userId),
      resolveBuildCoreMemberProjectVisibilityScope(supabase, organizationId, userId),
      resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId),
      resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
      resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'budget'),
    ]);

  const actorIsMember = isBuildCoreMemberRole(actorRole);

  const actionFlags = {
    workflowCanDownload: workflowAccess.canDownload === true,
    workflowCanDelete: workflowAccess.canDelete === true,
    paymentCanDownload: paymentAccess.canDownload === true,
    paymentCanDelete: paymentAccess.canDelete === true,
    budgetCanDownload: budgetAccess.canDownload === true,
    budgetCanDelete: budgetAccess.canDelete === true,
  };

  if (!actorIsMember || memberScope == null) {
    return {
      restrictMemberVisibility: false,
      allowedProjectIds: [],
      allowBudget: budgetAccess.canView === true,
      allowWorkflow: workflowAccess.canView === true,
      allowPayments: paymentAccess.canView === true,
      allowProjectMedia: true,
      viewerUserId: userId,
      onlyAssignedWorkflow: true,
      onlyAssignedPayments: true,
      memberRoleUserIds: [],
      actorIsMember: false,
      ...actionFlags,
    };
  }

  const memberVisibility = await resolveBuildCoreMemberTaskVisibilityInput(
    supabase,
    organizationId,
    userId
  );

  // Server-derived scope only (never client projectIds). Bounded to member-visible set.
  const allowedProjectIds = [
    ...memberScope.directProjectIds,
    ...memberScope.parentContainerProjectIds,
  ];

  return {
    restrictMemberVisibility: true,
    allowedProjectIds,
    allowBudget: budgetAccess.canView === true,
    allowWorkflow: workflowAccess.canView === true,
    allowPayments: paymentAccess.canView === true,
    allowProjectMedia: false,
    viewerUserId: userId,
    onlyAssignedWorkflow: memberVisibility.onlyAssignedUserCanView,
    onlyAssignedPayments: memberVisibility.onlyAssignedUserCanViewPayments ?? true,
    memberRoleUserIds: memberVisibility.memberRoleUserIds,
    actorIsMember: true,
    ...actionFlags,
  };
}

function toRpcArgs(visibility: PhotosVisibilityParams) {
  return {
    p_restrict_member_visibility: visibility.restrictMemberVisibility,
    p_allowed_project_ids: [...visibility.allowedProjectIds],
    p_allow_budget: visibility.allowBudget,
    p_allow_workflow: visibility.allowWorkflow,
    p_allow_payments: visibility.allowPayments,
    p_allow_project_media: visibility.allowProjectMedia,
    p_viewer_user_id: visibility.viewerUserId,
    p_only_assigned_workflow: visibility.onlyAssignedWorkflow,
    p_only_assigned_payments: visibility.onlyAssignedPayments,
    p_member_role_user_ids: [...visibility.memberRoleUserIds],
  };
}

async function loadProjectEnrichment(
  supabase: SupabaseClient,
  organizationId: string,
  projectIds: readonly string[]
): Promise<Map<string, ProjectEnrichmentRow>> {
  const map = new Map<string, ProjectEnrichmentRow>();
  if (projectIds.length === 0) return map;
  const { data, error } = await supabase
    .from('crm_projects')
    .select(
      'id, slug, name, parent_project_id, crm_clients ( company_name ), crm_contacts:primary_contact_id ( full_name )'
    )
    .eq('organization_id', organizationId)
    .in('id', [...projectIds])
    .is('archived_at', null);
  if (error != null) throw new Error(error.message);
  for (const row of (data ?? []) as unknown as ProjectEnrichmentRow[]) {
    map.set(row.id, row);
  }
  return map;
}

async function loadTaskEnrichment(
  supabase: SupabaseClient,
  organizationId: string,
  taskIds: readonly string[]
): Promise<Map<string, TaskEnrichmentRow>> {
  const map = new Map<string, TaskEnrichmentRow>();
  if (taskIds.length === 0) return map;
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('id, title, stage_slug')
    .eq('organization_id', organizationId)
    .in('id', [...taskIds])
    .is('archived_at', null);
  if (error != null) throw new Error(error.message);
  for (const row of (data ?? []) as TaskEnrichmentRow[]) {
    map.set(row.id, row);
  }
  return map;
}

function resolvePhotoActionFlags(
  row: DbCrmDocumentRow,
  visibility: PhotosVisibilityParams,
  isPaymentTask: boolean | null
): { readonly canDownload: boolean; readonly canDelete: boolean } {
  if (row.budget_entry_id != null) {
    return {
      canDownload: visibility.budgetCanDownload,
      canDelete: visibility.budgetCanDelete,
    };
  }
  if (row.workflow_task_id != null) {
    if (isPaymentTask === true) {
      return {
        canDownload: visibility.paymentCanDownload,
        canDelete: visibility.paymentCanDelete,
      };
    }
    return {
      canDownload: visibility.workflowCanDownload,
      canDelete: visibility.workflowCanDelete,
    };
  }
  return {
    canDownload: true,
    canDelete: !visibility.actorIsMember,
  };
}

export async function listCrmPhotosPageV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly request: CrmPhotosListV2NormalizedRequest;
  readonly cursor: string | null;
  readonly storage?: IDocumentStorageProvider | null;
}): Promise<CrmPhotosListV2PageResponse> {
  const started = Date.now();
  if (input.request.organizationId !== input.organizationId.trim().toLowerCase()) {
    throw new CrmPhotosListV2InvalidRequestError('organizationId mismatch');
  }

  let cursorCreatedAt: string | null = null;
  let cursorId: string | null = null;
  const hasIncomingCursor = Boolean(input.cursor?.trim());

  if (hasIncomingCursor && input.cursor != null) {
    const payload = await decodeCrmPhotosListV2Cursor({
      cursor: input.cursor,
      organizationId: input.organizationId,
      request: input.request,
    });
    const values = parsePhotosCursorValues(payload);
    cursorCreatedAt = values.createdAt;
    cursorId = values.id;
  }

  const visibility = await resolvePhotosListV2VisibilityParams(
    input.supabase,
    input.organizationId,
    input.userId
  );

  const fetchLimit = input.request.limit + 1;
  const { data, error } = await input.supabase.rpc('crm_list_organization_photos_page_v2', {
    p_organization_id: input.organizationId,
    p_search_prefix: input.request.search,
    p_limit: fetchLimit,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_id: cursorId,
    ...toRpcArgs(visibility),
  });

  if (error != null) {
    throw new Error(`crm_list_organization_photos_page_v2_failed: ${error.message}`);
  }

  let rows = (data ?? []) as DbCrmDocumentRow[];
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  rows = rows.filter((row) => {
    if (seenIds.has(row.id)) {
      duplicateCount += 1;
      return false;
    }
    seenIds.add(row.id);
    return true;
  });
  if (duplicateCount > 0) {
    logCrmPhotosListV2Event({
      name: 'crm.photos_list_v2.duplicate_rows',
      duplicateCount,
    });
  }

  const hasExtra = rows.length > input.request.limit;
  if (hasExtra) {
    rows = rows.slice(0, input.request.limit);
  }

  const pageProjectIds = [...new Set(rows.map((row) => row.project_id))];
  const pageTaskIds = [
    ...new Set(
      rows
        .map((row) => row.workflow_task_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const [projectById, taskById, memberById, amountByTaskId] = await Promise.all([
    loadProjectEnrichment(input.supabase, input.organizationId, pageProjectIds),
    loadTaskEnrichment(input.supabase, input.organizationId, pageTaskIds),
    loadCrmMemberMap(
      input.supabase,
      rows.flatMap((row) =>
        [row.uploaded_by_member_id, row.reviewed_by_member_id].filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        )
      ),
      { organizationId: input.organizationId }
    ),
    (async () => {
      const map = new Map<string, number | null>();
      if (pageTaskIds.length === 0) return map;
      const { data: amountRows, error: amountError } = await input.supabase
        .from('crm_workflow_tasks')
        .select('id, amount_cents')
        .eq('organization_id', input.organizationId)
        .in('id', pageTaskIds);
      if (amountError != null) throw new Error(amountError.message);
      for (const row of (amountRows ?? []) as readonly {
        id: string;
        amount_cents: number | null;
      }[]) {
        map.set(row.id, row.amount_cents);
      }
      return map;
    })(),
  ]);

  // Parent projects for labels (may not be in page project set).
  const parentIds = [
    ...new Set(
      [...projectById.values()]
        .map((project) => project.parent_project_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ].filter((id) => !projectById.has(id));
  if (parentIds.length > 0) {
    const parents = await loadProjectEnrichment(
      input.supabase,
      input.organizationId,
      parentIds
    );
    for (const [id, row] of parents) {
      projectById.set(id, row);
    }
  }

  const stageByTaskId = new Map<string, PipelineStageSlug>();
  for (const task of taskById.values()) {
    stageByTaskId.set(task.id, task.stage_slug as PipelineStageSlug);
  }

  const thumbnailUrlById = await loadCrmDocumentThumbnailSignedUrls({
    supabase: input.supabase,
    organizationId: input.organizationId,
    documentIds: rows.map((row) => row.id),
    storage: input.storage ?? null,
  });

  const items: CrmPhotoListItemV2[] = [];
  for (const row of rows) {
    const project = projectById.get(row.project_id);
    if (project == null) continue;
    const parent = project.parent_project_id
      ? projectById.get(project.parent_project_id) ?? null
      : null;
    const task = row.workflow_task_id ? taskById.get(row.workflow_task_id) ?? null : null;
    const amountCents =
      row.workflow_task_id != null ? amountByTaskId.get(row.workflow_task_id) ?? null : null;
    const flags = resolvePhotoActionFlags(
      row,
      visibility,
      row.workflow_task_id != null ? amountCents != null : null
    );

    const document = mapDbDocument(row, stageByTaskId, memberById);
    items.push({
      id: document.id,
      document,
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      parentProjectId: parent?.id ?? null,
      parentProjectSlug: parent?.slug ?? null,
      parentProjectName: parent?.name ?? null,
      taskName: task?.title ?? null,
      customerName:
        joinedName(project.crm_clients, 'company_name') ??
        joinedName(project.crm_contacts, 'full_name'),
      canDownload: flags.canDownload,
      canDelete: flags.canDelete,
      thumbnailUrl: thumbnailUrlById.get(document.id) ?? null,
    });
  }

  const last = items[items.length - 1] ?? null;
  const nextCursor =
    hasExtra && last != null
      ? await encodeCrmPhotosListV2Cursor({
          organizationId: input.organizationId,
          request: input.request,
          direction: 'forward',
          values: [last.document.uploadedAt, last.id],
          id: last.id,
        })
      : null;

  const payloadBytesApprox = Buffer.byteLength(JSON.stringify({ items }), 'utf8');
  const unexpectedlyShortPage =
    hasIncomingCursor &&
    !hasExtra &&
    items.length > 0 &&
    items.length < input.request.limit;

  logCrmPhotosListV2Event({
    name: 'crm.photos_list_v2.query',
    durationMs: Date.now() - started,
    rowsReturned: items.length,
    requestedLimit: input.request.limit,
    direction: hasIncomingCursor ? 'forward' : 'first',
    searchActive: input.request.search != null,
    payloadBytesApprox,
    unexpectedlyShortPage,
  });

  if (items.length === 0) {
    logCrmPhotosListV2Event({ name: 'crm.photos_list_v2.empty_page' });
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

export async function hasNewerCrmPhotosV2(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly afterCreatedAt: string;
  readonly afterId: string;
}): Promise<boolean> {
  const visibility = await resolvePhotosListV2VisibilityParams(
    input.supabase,
    input.organizationId,
    input.userId
  );
  const { data, error } = await input.supabase.rpc('crm_organization_photos_has_newer_v2', {
    p_organization_id: input.organizationId,
    p_after_created_at: input.afterCreatedAt,
    p_after_id: input.afterId,
    ...toRpcArgs(visibility),
  });
  if (error != null) {
    throw new Error(`crm_organization_photos_has_newer_v2_failed: ${error.message}`);
  }
  return Boolean(data);
}

export { CrmPhotosListV2InvalidCursorError };
