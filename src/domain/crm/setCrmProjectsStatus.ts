import type { CrmLossReason, CrmProjectStatus } from './projectStatus';
import {
  isCrmLossReason,
  isCrmProjectStatus,
  validateSetCrmProjectsStatusInput,
} from './projectStatus';

/** Max IDs per POST /api/crm/projects/status (aligned with documents/photos bulk). */
export const CRM_PROJECTS_STATUS_BULK_MAX_IDS = 100;

export type CrmProjectStatusChangeSource =
  | 'detail_pill'
  | 'table_bulk'
  | 'legacy_adapter'
  | 'api';

export type CrmProjectStatusFailureCode =
  | 'not_found'
  | 'unauthorized'
  | 'confirmation_required'
  /** @deprecated Prefer confirmation_required */
  | 'completion_blocked'
  | 'invalid_transition'
  | 'already_at_status'
  | 'update_failed';

export type SetCrmProjectsStatusInput = {
  readonly projectSlugs: readonly string[];
  readonly status: CrmProjectStatus;
  readonly lossReason?: CrmLossReason | null;
  readonly lossReasonOther?: string | null;
  readonly source?: CrmProjectStatusChangeSource | null;
  /**
   * When status is completed and incomplete workflow tasks remain, the server returns
   * confirmation_required unless this is true (Complete Anyway).
   */
  readonly confirmIncompleteTasks?: boolean | null;
};

export type CrmProjectStatusChangeResultItem = {
  readonly slug: string;
  readonly success: boolean;
  readonly previousStatus: CrmProjectStatus | null;
  readonly requestedStatus: CrmProjectStatus;
  readonly resultingStatus: CrmProjectStatus | null;
  readonly failureCode: CrmProjectStatusFailureCode | null;
  readonly message: string | null;
  /** Present when failureCode is confirmation_required. */
  readonly incompleteTaskCount?: number;
  /** Stages that still have incomplete tasks (informational). */
  readonly incompleteStages?: readonly { readonly stageSlug: string; readonly stageLabel: string }[];
};

export type SetCrmProjectsStatusResult = {
  readonly bulkOperationId: string;
  readonly updatedCount: number;
  readonly results: readonly CrmProjectStatusChangeResultItem[];
};

export function validateSetCrmProjectsStatusRequest(
  input: SetCrmProjectsStatusInput
): string | null {
  if (input.projectSlugs.length > CRM_PROJECTS_STATUS_BULK_MAX_IDS) {
    return `Select at most ${CRM_PROJECTS_STATUS_BULK_MAX_IDS} projects.`;
  }
  const base = validateSetCrmProjectsStatusInput({
    projectSlugs: input.projectSlugs,
    status: input.status,
    lossReason: input.lossReason,
    lossReasonOther: input.lossReasonOther,
  });
  if (base != null) return base;
  return null;
}

export function normalizeLossReasonOtherForWrite(
  status: CrmProjectStatus,
  lossReason: CrmLossReason | null | undefined,
  lossReasonOther: string | null | undefined
): string | null {
  if (status !== 'lost') return null;
  if (lossReason !== 'other') return null;
  return lossReasonOther?.trim() || null;
}

export function isCrmProjectStatusAlreadyAtTarget(input: {
  readonly currentStatus: CrmProjectStatus;
  readonly currentLossReason: CrmLossReason | null;
  readonly currentLossReasonOther: string | null;
  readonly requestedStatus: CrmProjectStatus;
  readonly requestedLossReason: CrmLossReason | null | undefined;
  readonly requestedLossReasonOther: string | null | undefined;
}): boolean {
  if (input.currentStatus !== input.requestedStatus) return false;
  if (input.requestedStatus !== 'lost') return true;
  const currentOther = input.currentLossReasonOther?.trim() || null;
  const requestedOther =
    input.requestedLossReason === 'other'
      ? input.requestedLossReasonOther?.trim() || null
      : null;
  return (
    input.currentLossReason === (input.requestedLossReason ?? null) &&
    currentOther === requestedOther
  );
}

export function formatIncompleteTasksCompletionWarning(incompleteTaskCount: number): string {
  const n = Math.max(0, incompleteTaskCount);
  if (n === 1) {
    return 'This project still has 1 incomplete workflow task. Mark it Completed anyway?';
  }
  return `This project still has ${n} incomplete workflow tasks. Mark it Completed anyway?`;
}

export function parseSetCrmProjectsStatusBody(body: unknown): SetCrmProjectsStatusInput | null {
  if (body == null || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const slugsRaw = record.projectSlugs ?? record.slugs;
  if (!Array.isArray(slugsRaw)) return null;
  const projectSlugs = slugsRaw.filter((slug): slug is string => typeof slug === 'string');

  const statusRaw = record.status;
  if (typeof statusRaw !== 'string' || !isCrmProjectStatus(statusRaw)) return null;

  const lossReasonRaw = record.lossReason;
  const lossReason =
    lossReasonRaw == null
      ? null
      : typeof lossReasonRaw === 'string' && isCrmLossReason(lossReasonRaw)
        ? lossReasonRaw
        : undefined;
  if (lossReason === undefined && lossReasonRaw != null) return null;

  const otherRaw = record.lossReasonOther;
  const lossReasonOther =
    otherRaw == null ? null : typeof otherRaw === 'string' ? otherRaw : null;
  if (otherRaw != null && typeof otherRaw !== 'string') return null;

  const sourceRaw = record.source;
  const source =
    sourceRaw == null
      ? null
      : sourceRaw === 'detail_pill' ||
          sourceRaw === 'table_bulk' ||
          sourceRaw === 'legacy_adapter' ||
          sourceRaw === 'api'
        ? sourceRaw
        : null;
  if (sourceRaw != null && source == null) return null;

  const confirmRaw = record.confirmIncompleteTasks;
  const confirmIncompleteTasks =
    confirmRaw == null ? null : typeof confirmRaw === 'boolean' ? confirmRaw : undefined;
  if (confirmIncompleteTasks === undefined) return null;

  return {
    projectSlugs,
    status: statusRaw,
    lossReason,
    lossReasonOther,
    source,
    confirmIncompleteTasks,
  };
}
