import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canMarkProjectCompleteByWorkflowTasks,
  listIncompleteWorkflowStages,
} from '@/domain/buildcore/projectPipelineProgress';
import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';
import {
  buildCrmProjectStatusDualWritePatch,
  resolveCrmProjectStatusFieldsFromDb,
  type CrmLossReason,
  type CrmProjectStatus,
} from '@/domain/crm/projectStatus';
import type { CrmPriority } from '@/domain/crm/project';
import { canActorChangeCrmProjectStatus } from '@/domain/crm/projectStatusAccess';
import {
  isCrmProjectStatusAlreadyAtTarget,
  normalizeLossReasonOtherForWrite,
  validateSetCrmProjectsStatusRequest,
  type CrmProjectStatusChangeResultItem,
  type SetCrmProjectsStatusInput,
  type SetCrmProjectsStatusResult,
} from '@/domain/crm/setCrmProjectsStatus';
import { appendCrmAccountabilityEvent } from './crmAccountability';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { loadOrganizationPipelineStageCatalogForProject } from './pipelineStageService';

export class CrmSetProjectsStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrmSetProjectsStatusValidationError';
  }
}

type StatusRow = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parent_project_id: string | null;
  readonly assigned_member_id: string | null;
  readonly priority: string;
  readonly completed_at: string | null;
  readonly project_status: string | null;
  readonly loss_reason: string | null;
  readonly loss_reason_other: string | null;
  readonly status_changed_at: string | null;
  readonly subproject_status: string | null;
  readonly inactive_reason: string | null;
  readonly inactive_reason_custom: string | null;
  readonly inactive_at: string | null;
};

function resolveRowStatus(row: StatusRow): {
  readonly status: CrmProjectStatus;
  readonly lossReason: CrmLossReason | null;
  readonly lossReasonOther: string | null;
} {
  const resolved = resolveCrmProjectStatusFieldsFromDb({
    projectStatus: row.project_status,
    lossReason: row.loss_reason,
    lossReasonOther: row.loss_reason_other,
    statusChangedAt: row.status_changed_at,
    legacySubprojectStatus: row.subproject_status,
    legacyInactiveReason: row.inactive_reason,
    legacyInactiveReasonCustom: row.inactive_reason_custom,
    legacyInactiveAt: row.inactive_at,
    priority: (row.priority as CrmPriority) || 'normal',
    completedAt: row.completed_at,
  });
  return {
    status: resolved.status,
    lossReason: resolved.lossReason,
    lossReasonOther: resolved.lossReasonOther,
  };
}

function entityKind(row: StatusRow): 'project' | 'subproject' {
  return row.parent_project_id == null ? 'project' : 'subproject';
}

export type SetCrmProjectsStatusServiceDeps = {
  readonly loadActorRole: typeof loadActiveOrganizationMemberRole;
  readonly getProjectDetail: typeof getCrmProjectDetailBySlugForOrg;
  readonly loadPipelineStages: typeof loadOrganizationPipelineStageCatalogForProject;
  readonly appendAccountability: typeof appendCrmAccountabilityEvent;
  readonly nowIso?: () => string;
  readonly createBulkOperationId?: () => string;
};

const defaultDeps: SetCrmProjectsStatusServiceDeps = {
  loadActorRole: loadActiveOrganizationMemberRole,
  getProjectDetail: getCrmProjectDetailBySlugForOrg,
  loadPipelineStages: loadOrganizationPipelineStageCatalogForProject,
  appendAccountability: appendCrmAccountabilityEvent,
};

/**
 * Unified Project/Subproject status writer (single + bulk).
 *
 * Consistency: Supabase JS has no multi-statement transaction helper used elsewhere in CRM
 * mutations. This service mirrors mark-inactive: per-record update then accountability insert.
 * Risk: a row update can succeed while its accountability insert fails (same as today).
 * All status writes must go through this function so dual-write cannot drift.
 */
export async function setCrmProjectsStatusForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  input: SetCrmProjectsStatusInput,
  deps: Partial<SetCrmProjectsStatusServiceDeps> = {}
): Promise<SetCrmProjectsStatusResult> {
  const resolved: SetCrmProjectsStatusServiceDeps = { ...defaultDeps, ...deps };
  const validationError = validateSetCrmProjectsStatusRequest(input);
  if (validationError != null) {
    throw new CrmSetProjectsStatusValidationError(validationError);
  }

  const bulkOperationId = (resolved.createBulkOperationId ?? randomUUID)();
  const requestedStatus = input.status;
  const lossReason =
    requestedStatus === 'lost' ? (input.lossReason as CrmLossReason) : null;
  const lossReasonOther = normalizeLossReasonOtherForWrite(
    requestedStatus,
    lossReason,
    input.lossReasonOther
  );
  const source = input.source ?? 'api';

  const orderedSlugs = input.projectSlugs.map((slug) => slug.trim()).filter(Boolean);
  const uniqueSlugs = [...new Set(orderedSlugs)];
  const resultsBySlug = new Map<string, CrmProjectStatusChangeResultItem>();

  const actorRole = await resolved.loadActorRole(supabase, organizationId, actorUserId);

  const { data: rows, error: fetchError } = await supabase
    .from('crm_projects')
    .select(
      [
        'id',
        'name',
        'slug',
        'parent_project_id',
        'assigned_member_id',
        'priority',
        'completed_at',
        'project_status',
        'loss_reason',
        'loss_reason_other',
        'status_changed_at',
        'subproject_status',
        'inactive_reason',
        'inactive_reason_custom',
        'inactive_at',
      ].join(', ')
    )
    .eq('organization_id', organizationId)
    .in('slug', uniqueSlugs)
    .is('archived_at', null);

  if (fetchError) throw new Error(fetchError.message);

  const foundBySlug = new Map(
    ((rows ?? []) as unknown as StatusRow[]).map((row) => [row.slug, row] as const)
  );

  const now = (resolved.nowIso ?? (() => new Date().toISOString()))();
  let updatedCount = 0;

  for (const slug of orderedSlugs) {
    if (resultsBySlug.has(slug)) {
      continue;
    }

    const row = foundBySlug.get(slug);
    if (row == null) {
      resultsBySlug.set(slug, {
        slug,
        success: false,
        previousStatus: null,
        requestedStatus,
        resultingStatus: null,
        failureCode: 'not_found',
        message: 'Project not found.',
      });
      continue;
    }

    const previous = resolveRowStatus(row);

    if (
      !canActorChangeCrmProjectStatus({
        role: actorRole,
        actorUserId,
        assignedMemberId: row.assigned_member_id,
      })
    ) {
      resultsBySlug.set(slug, {
        slug,
        success: false,
        previousStatus: previous.status,
        requestedStatus,
        resultingStatus: null,
        failureCode: 'unauthorized',
        message: 'You do not have permission to change status for this project.',
      });
      continue;
    }

    if (
      isCrmProjectStatusAlreadyAtTarget({
        currentStatus: previous.status,
        currentLossReason: previous.lossReason,
        currentLossReasonOther: previous.lossReasonOther,
        requestedStatus,
        requestedLossReason: lossReason,
        requestedLossReasonOther: lossReasonOther,
      })
    ) {
      resultsBySlug.set(slug, {
        slug,
        success: false,
        previousStatus: previous.status,
        requestedStatus,
        resultingStatus: previous.status,
        failureCode: 'already_at_status',
        message: 'Project is already at the requested status.',
      });
      continue;
    }

    let completionExtras: {
      readonly priority: CrmPriority;
      readonly currentStageSlug: string;
    } | null = null;
    let incompleteStages:
      | readonly { readonly stageSlug: string; readonly stageLabel: string }[]
      | undefined;

    if (requestedStatus === 'completed') {
      const detail = await resolved.getProjectDetail(supabase, organizationId, slug);
      if (detail == null) {
        resultsBySlug.set(slug, {
          slug,
          success: false,
          previousStatus: previous.status,
          requestedStatus,
          resultingStatus: null,
          failureCode: 'not_found',
          message: 'Project not found.',
        });
        continue;
      }
      const pipelineStages = await resolved.loadPipelineStages(
        supabase,
        organizationId,
        detail.summary
      );
      const completionInput = {
        workflowTasks: detail.workflowTasks,
        stages: pipelineStages,
        manualStageCompletions: detail.manualStageCompletions,
      };
      if (!canMarkProjectCompleteByWorkflowTasks(completionInput)) {
        incompleteStages = listIncompleteWorkflowStages(completionInput);
        resultsBySlug.set(slug, {
          slug,
          success: false,
          previousStatus: previous.status,
          requestedStatus,
          resultingStatus: null,
          failureCode: 'completion_blocked',
          message: 'All workflow tasks must be done before marking this project complete',
          incompleteStages,
        });
        continue;
      }
      completionExtras = {
        priority: 'low',
        currentStageSlug: CRM_PROJECT_COMPLETE_STAGE_SLUG,
      };
    }

    const patch = buildCrmProjectStatusDualWritePatch({
      status: requestedStatus,
      priority: (row.priority as CrmPriority) || 'normal',
      lossReason,
      lossReasonOther,
      changedAt: now,
      changedBy: actorUserId,
      completionExtras,
    });

    const { error: updateError } = await supabase
      .from('crm_projects')
      .update(patch)
      .eq('id', row.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      resultsBySlug.set(slug, {
        slug,
        success: false,
        previousStatus: previous.status,
        requestedStatus,
        resultingStatus: null,
        failureCode: 'update_failed',
        message: updateError.message || 'Failed to update project status.',
      });
      continue;
    }

    try {
      await resolved.appendAccountability(supabase, {
        organizationId,
        projectId: row.id,
        actorMemberId: actorUserId,
        eventType: 'project_status_changed',
        summary: `Changed project status: ${row.name} (${previous.status} → ${requestedStatus})`,
        metadata: {
          entityKind: entityKind(row),
          entityId: row.id,
          slug,
          previousStatus: previous.status,
          newStatus: requestedStatus,
          lossReason,
          lossReasonOther,
          source,
          bulkOperationId,
          statusChangedAt: now,
        },
      });
    } catch (accountabilityError) {
      // Row already updated — surface as update_failed with context (same risk class as legacy writers).
      resultsBySlug.set(slug, {
        slug,
        success: false,
        previousStatus: previous.status,
        requestedStatus,
        resultingStatus: requestedStatus,
        failureCode: 'update_failed',
        message:
          accountabilityError instanceof Error
            ? `Status updated but accountability failed: ${accountabilityError.message}`
            : 'Status updated but accountability failed.',
      });
      continue;
    }

    updatedCount += 1;
    resultsBySlug.set(slug, {
      slug,
      success: true,
      previousStatus: previous.status,
      requestedStatus,
      resultingStatus: requestedStatus,
      failureCode: null,
      message: null,
    });
  }

  const results = orderedSlugs.map((slug) => {
    const item = resultsBySlug.get(slug);
    if (item != null) return item;
    return {
      slug,
      success: false,
      previousStatus: null,
      requestedStatus,
      resultingStatus: null,
      failureCode: 'not_found' as const,
      message: 'Project not found.',
    };
  });

  return { bulkOperationId, updatedCount, results };
}
