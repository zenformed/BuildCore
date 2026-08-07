import type { CrmPriority, CrmProjectSummary } from './project';
import { isProjectPriorityUrgent } from './projectPriorityToggle';
import { computeCrmProjectListSortBucket } from './projectsListV2/listSortBucket';

/**
 * Project/Subproject status — independent of priority, pipeline stage, and archive.
 * Shared by parent projects and subprojects (same crm_projects row shape).
 */
export type CrmProjectStatus = 'active' | 'completed' | 'lost' | 'cancelled';

export const CRM_PROJECT_STATUS_VALUES: readonly CrmProjectStatus[] = [
  'active',
  'completed',
  'lost',
  'cancelled',
] as const;

export type CrmLossReason =
  | 'chose_competitor'
  | 'price'
  | 'no_response'
  | 'outside_service_area'
  | 'not_qualified'
  | 'duplicate'
  | 'dead_lead'
  | 'other';

export const CRM_LOSS_REASON_VALUES: readonly CrmLossReason[] = [
  'chose_competitor',
  'price',
  'no_response',
  'outside_service_area',
  'not_qualified',
  'duplicate',
  'dead_lead',
  'other',
] as const;

export type CrmLossReasonOption = {
  readonly value: CrmLossReason;
  readonly label: string;
};

export const CRM_LOSS_REASON_OPTIONS: readonly CrmLossReasonOption[] = [
  { value: 'chose_competitor', label: 'Chose competitor' },
  { value: 'price', label: 'Price' },
  { value: 'no_response', label: 'No response' },
  { value: 'outside_service_area', label: 'Outside service area' },
  { value: 'not_qualified', label: 'Not qualified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'dead_lead', label: 'Dead lead' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Legacy DB CHECK values on crm_projects.inactive_reason / subproject_status.
 * Kept for mark-inactive dual-write until Phase 5 cleanup.
 */
export type CrmLegacySubprojectStatus = 'urgent' | 'normal' | 'completed' | 'inactive';

export const CRM_LEGACY_SUBPROJECT_STATUS_VALUES: readonly CrmLegacySubprojectStatus[] = [
  'urgent',
  'normal',
  'completed',
  'inactive',
] as const;

export type CrmLegacyInactiveReason =
  | 'chose_competitor'
  | 'price'
  | 'no_response'
  | 'project_canceled'
  | 'outside_service_area'
  | 'not_qualified'
  | 'duplicate'
  | 'other';

export const CRM_LEGACY_INACTIVE_REASON_VALUES: readonly CrmLegacyInactiveReason[] = [
  'chose_competitor',
  'price',
  'no_response',
  'project_canceled',
  'outside_service_area',
  'not_qualified',
  'duplicate',
  'other',
] as const;

export type CrmLegacyInactiveReasonOption = {
  readonly value: CrmLegacyInactiveReason;
  readonly label: string;
};

/** Options for the current Mark Inactive dialog (Phase 0–3 until Lost modal ships). */
export const CRM_LEGACY_INACTIVE_REASON_OPTIONS: readonly CrmLegacyInactiveReasonOption[] = [
  { value: 'chose_competitor', label: 'Chose another competitor' },
  { value: 'price', label: 'Price' },
  { value: 'no_response', label: 'No response' },
  { value: 'project_canceled', label: 'Project canceled' },
  { value: 'outside_service_area', label: 'Outside service area' },
  { value: 'not_qualified', label: 'Not qualified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

export function isCrmProjectStatus(value: string): value is CrmProjectStatus {
  return (CRM_PROJECT_STATUS_VALUES as readonly string[]).includes(value);
}

export function isCrmLossReason(value: string): value is CrmLossReason {
  return (CRM_LOSS_REASON_VALUES as readonly string[]).includes(value);
}

export function isCrmLegacySubprojectStatus(value: string): value is CrmLegacySubprojectStatus {
  return (CRM_LEGACY_SUBPROJECT_STATUS_VALUES as readonly string[]).includes(value);
}

export function isCrmLegacyInactiveReason(value: string): value is CrmLegacyInactiveReason {
  return (CRM_LEGACY_INACTIVE_REASON_VALUES as readonly string[]).includes(value);
}

/** Lost or Cancelled — replaces former inactive edit/mutation lock. */
export function isCrmProjectLostOrCancelled(
  project: Pick<CrmProjectSummary, 'status'>
): boolean {
  return project.status === 'lost' || project.status === 'cancelled';
}

/** @deprecated Prefer isCrmProjectLostOrCancelled — alias for Phase 0 call-site migration. */
export function isCrmProjectInactive(project: Pick<CrmProjectSummary, 'status'>): boolean {
  return isCrmProjectLostOrCancelled(project);
}

export function isCrmProjectLost(project: Pick<CrmProjectSummary, 'status'>): boolean {
  return project.status === 'lost';
}

export function getCrmLossReasonLabel(
  reason: CrmLossReason,
  customReason: string | null
): string {
  if (reason === 'other') {
    const trimmed = customReason?.trim();
    return trimmed ? trimmed : 'Other';
  }
  const match = CRM_LOSS_REASON_OPTIONS.find((option) => option.value === reason);
  return match?.label ?? reason;
}

export function getCrmLegacyInactiveReasonLabel(
  reason: CrmLegacyInactiveReason,
  customReason: string | null
): string {
  if (reason === 'other') {
    const trimmed = customReason?.trim();
    return trimmed ? trimmed : 'Other';
  }
  const match = CRM_LEGACY_INACTIVE_REASON_OPTIONS.find((option) => option.value === reason);
  return match?.label ?? reason;
}

/**
 * Derive domain status from legacy DB columns (Phase 0–2 dual-read fallback).
 * Prefer `project_status` when present (Phase 1+).
 */
export function deriveCrmProjectStatusFromLegacy(input: {
  readonly legacySubprojectStatus?: string | null;
  readonly legacyInactiveReason?: string | null;
  readonly priority: CrmPriority;
  readonly completedAt: string | null;
}): CrmProjectStatus {
  const legacy = input.legacySubprojectStatus;
  if (legacy === 'inactive') {
    if (input.legacyInactiveReason === 'project_canceled') return 'cancelled';
    return 'lost';
  }
  if (legacy === 'completed' || input.completedAt != null) return 'completed';
  return 'active';
}

/** Map legacy inactive_reason to loss_reason (null when Cancelled). */
export function mapLegacyInactiveReasonToLossReason(
  reason: string | null | undefined
): CrmLossReason | null {
  if (reason == null) return null;
  if (reason === 'project_canceled') return null;
  if (isCrmLossReason(reason)) return reason;
  return null;
}

/**
 * Resolve public status fields from DB row columns.
 * Prefers project_status / loss_* / status_changed_* when present; else legacy derive.
 */
export function resolveCrmProjectStatusFieldsFromDb(input: {
  readonly projectStatus?: string | null;
  readonly lossReason?: string | null;
  readonly lossReasonOther?: string | null;
  readonly statusChangedAt?: string | null;
  readonly legacySubprojectStatus?: string | null;
  readonly legacyInactiveReason?: string | null;
  readonly legacyInactiveReasonCustom?: string | null;
  readonly legacyInactiveAt?: string | null;
  readonly priority: CrmPriority;
  readonly completedAt: string | null;
}): {
  readonly status: CrmProjectStatus;
  readonly lossReason: CrmLossReason | null;
  readonly lossReasonOther: string | null;
  readonly statusChangedAt: string | null;
} {
  if (input.projectStatus != null && isCrmProjectStatus(input.projectStatus)) {
    const status = input.projectStatus;
    if (status !== 'lost') {
      return {
        status,
        lossReason: null,
        lossReasonOther: null,
        statusChangedAt:
          input.statusChangedAt ??
          (status === 'completed' ? input.completedAt : input.legacyInactiveAt ?? null),
      };
    }

    const lossReason: CrmLossReason =
      input.lossReason != null && isCrmLossReason(input.lossReason)
        ? input.lossReason
        : mapLegacyInactiveReasonToLossReason(input.legacyInactiveReason) ?? 'other';

    const lossReasonOther =
      lossReason === 'other'
        ? input.lossReasonOther ??
          (input.legacyInactiveReason === 'other'
            ? input.legacyInactiveReasonCustom ?? null
            : null)
        : null;

    return {
      status,
      lossReason,
      lossReasonOther,
      statusChangedAt: input.statusChangedAt ?? input.legacyInactiveAt ?? null,
    };
  }

  const status = deriveCrmProjectStatusFromLegacy({
    legacySubprojectStatus: input.legacySubprojectStatus,
    legacyInactiveReason: input.legacyInactiveReason,
    priority: input.priority,
    completedAt: input.completedAt,
  });

  if (status === 'cancelled') {
    return {
      status,
      lossReason: null,
      lossReasonOther: null,
      statusChangedAt: input.legacyInactiveAt ?? null,
    };
  }

  if (status === 'lost') {
    const mapped = mapLegacyInactiveReasonToLossReason(input.legacyInactiveReason);
    if (mapped != null) {
      return {
        status,
        lossReason: mapped,
        lossReasonOther:
          mapped === 'other' ? input.legacyInactiveReasonCustom ?? null : null,
        statusChangedAt: input.legacyInactiveAt ?? null,
      };
    }
    const preserved =
      input.legacyInactiveReason == null
        ? input.legacyInactiveReasonCustom?.trim() || '[legacy] missing inactive_reason'
        : input.legacyInactiveReasonCustom?.trim() ||
          `[legacy] invalid inactive_reason: ${input.legacyInactiveReason}`;
    return {
      status,
      lossReason: 'other',
      lossReasonOther: preserved,
      statusChangedAt: input.legacyInactiveAt ?? null,
    };
  }

  return {
    status,
    lossReason: null,
    lossReasonOther: null,
    statusChangedAt: status === 'completed' ? input.completedAt : null,
  };
}

/** Values to dual-write onto project_status / loss_* for a lost/cancelled transition. */
export function toProjectStatusWriteFieldsFromLegacyInactive(input: {
  readonly reason: CrmLegacyInactiveReason;
  readonly customReason?: string | null;
  readonly changedAt: string;
  readonly changedBy: string;
}): {
  readonly project_status: 'lost' | 'cancelled';
  readonly loss_reason: CrmLossReason | null;
  readonly loss_reason_other: string | null;
  readonly status_changed_at: string;
  readonly status_changed_by: string;
} {
  if (input.reason === 'project_canceled') {
    return {
      project_status: 'cancelled',
      loss_reason: null,
      loss_reason_other: null,
      status_changed_at: input.changedAt,
      status_changed_by: input.changedBy,
    };
  }
  const lossReason = mapLegacyInactiveReasonToLossReason(input.reason) ?? 'other';
  return {
    project_status: 'lost',
    loss_reason: lossReason,
    loss_reason_other: lossReason === 'other' ? input.customReason?.trim() ?? null : null,
    status_changed_at: input.changedAt,
    status_changed_by: input.changedBy,
  };
}

export function toLegacyInactiveReasonForDualWrite(
  status: CrmProjectStatus,
  lossReason: CrmLossReason | null
): {
  readonly inactive_reason: CrmLegacyInactiveReason | null;
  readonly inactive_reason_custom: string | null;
} {
  if (status === 'cancelled') {
    return { inactive_reason: 'project_canceled', inactive_reason_custom: null };
  }
  if (status !== 'lost' || lossReason == null) {
    return { inactive_reason: null, inactive_reason_custom: null };
  }
  // dead_lead is not in the legacy inactive_reason CHECK — store as other.
  if (lossReason === 'dead_lead') {
    return { inactive_reason: 'other', inactive_reason_custom: 'Dead lead' };
  }
  if (isCrmLegacyInactiveReason(lossReason)) {
    return { inactive_reason: lossReason, inactive_reason_custom: null };
  }
  return { inactive_reason: 'other', inactive_reason_custom: lossReason };
}

/** Derive legacy subproject_status for dual-write until Phase 5. */
export function toLegacySubprojectStatus(input: {
  readonly status: CrmProjectStatus;
  readonly priority: CrmPriority;
}): CrmLegacySubprojectStatus {
  if (input.status === 'lost' || input.status === 'cancelled') return 'inactive';
  if (input.status === 'completed') return 'completed';
  if (isProjectPriorityUrgent(input.priority)) return 'urgent';
  return 'normal';
}

/**
 * Full dual-write patch for a status transition (new + legacy columns).
 * Caller supplies completion side-effects (priority/stage) when status is completed.
 */
export function buildCrmProjectStatusDualWritePatch(input: {
  readonly status: CrmProjectStatus;
  readonly priority: CrmPriority;
  readonly lossReason: CrmLossReason | null;
  readonly lossReasonOther: string | null;
  readonly changedAt: string;
  readonly changedBy: string;
  readonly completionExtras?: {
    readonly priority: CrmPriority;
    readonly currentStageSlug: string;
  } | null;
}): Record<string, unknown> {
  const legacyInactive = toLegacyInactiveReasonForDualWrite(input.status, input.lossReason);
  const isClosed = input.status === 'lost' || input.status === 'cancelled';
  const isCompleted = input.status === 'completed';
  const isActive = input.status === 'active';
  const effectivePriority = input.completionExtras?.priority ?? input.priority;

  const patch: Record<string, unknown> = {
    project_status: input.status,
    loss_reason: input.status === 'lost' ? input.lossReason : null,
    loss_reason_other:
      input.status === 'lost' && input.lossReason === 'other' ? input.lossReasonOther : null,
    status_changed_at: input.changedAt,
    status_changed_by: input.changedBy,
    subproject_status: toLegacySubprojectStatus({
      status: input.status,
      priority: effectivePriority,
    }),
    inactive_reason: null,
    inactive_reason_custom: null,
    inactive_at: null,
    inactive_by: null,
    last_activity_at: input.changedAt,
  };

  if (isClosed) {
    patch.inactive_reason = legacyInactive.inactive_reason;
    patch.inactive_reason_custom =
      input.status === 'lost' && input.lossReason === 'other'
        ? input.lossReasonOther
        : legacyInactive.inactive_reason_custom;
    patch.inactive_at = input.changedAt;
    patch.inactive_by = input.changedBy;
    // Lost/Cancelled must not retain completion metadata (even if stale).
    patch.completed_at = null;
    patch.completed_by = null;
  }

  if (isActive) {
    patch.completed_at = null;
    patch.completed_by = null;
  }

  if (isCompleted) {
    patch.completed_at = input.changedAt;
    patch.completed_by = input.changedBy;
    if (input.completionExtras != null) {
      patch.priority = input.completionExtras.priority;
      patch.current_stage_slug = input.completionExtras.currentStageSlug;
    }
  }

  return patch;
}

export function resolveCrmProjectListSortRank(
  project: Pick<CrmProjectSummary, 'status' | 'priority' | 'completedAt'>
): number {
  return computeCrmProjectListSortBucket({
    status: project.status,
    completedAt: project.completedAt,
    priority: project.priority,
  });
}

export type MarkCrmProjectsInactiveInput = {
  readonly projectSlugs: readonly string[];
  readonly reason: CrmLegacyInactiveReason;
  readonly customReason?: string | null;
};

export type MarkCrmProjectsActiveInput = {
  readonly projectSlugs: readonly string[];
};

export function validateMarkCrmProjectsInactiveInput(
  input: MarkCrmProjectsInactiveInput
): string | null {
  if (input.projectSlugs.length === 0) {
    return 'At least one project is required.';
  }
  if (!isCrmLegacyInactiveReason(input.reason)) {
    return 'A valid inactive reason is required.';
  }
  if (input.reason === 'other' && !input.customReason?.trim()) {
    return 'Custom reason is required when Other is selected.';
  }
  return null;
}

export function validateSetCrmProjectsStatusInput(input: {
  readonly projectSlugs: readonly string[];
  readonly status: CrmProjectStatus;
  readonly lossReason?: CrmLossReason | null;
  readonly lossReasonOther?: string | null;
}): string | null {
  if (input.projectSlugs.length === 0) {
    return 'At least one project is required.';
  }
  if (!isCrmProjectStatus(input.status)) {
    return 'A valid status is required.';
  }
  if (input.status === 'lost') {
    if (input.lossReason == null || !isCrmLossReason(input.lossReason)) {
      return 'A loss reason is required when status is Lost.';
    }
    if (input.lossReason === 'other' && !input.lossReasonOther?.trim()) {
      return 'Custom reason is required when Other is selected.';
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Deprecated aliases — remove in Phase 5                                      */
/* -------------------------------------------------------------------------- */

/** @deprecated Use CrmProjectStatus */
export type CrmSubprojectStatus = CrmLegacySubprojectStatus;

/** @deprecated Use CrmLossReason / CrmLegacyInactiveReason */
export type CrmInactiveReason = CrmLegacyInactiveReason;

/** @deprecated Use CRM_PROJECT_STATUS_VALUES / CRM_LEGACY_SUBPROJECT_STATUS_VALUES */
export const CRM_SUBPROJECT_STATUS_VALUES = CRM_LEGACY_SUBPROJECT_STATUS_VALUES;

/** @deprecated Use CRM_LOSS_REASON_VALUES / CRM_LEGACY_INACTIVE_REASON_VALUES */
export const CRM_INACTIVE_REASON_VALUES = CRM_LEGACY_INACTIVE_REASON_VALUES;

/** @deprecated Use CRM_LOSS_REASON_OPTIONS / CRM_LEGACY_INACTIVE_REASON_OPTIONS */
export const CRM_INACTIVE_REASON_OPTIONS = CRM_LEGACY_INACTIVE_REASON_OPTIONS;

/** @deprecated Use CrmLossReasonOption / CrmLegacyInactiveReasonOption */
export type CrmInactiveReasonOption = CrmLegacyInactiveReasonOption;

/** @deprecated Use isCrmLegacySubprojectStatus */
export const isCrmSubprojectStatus = isCrmLegacySubprojectStatus;

/** @deprecated Use isCrmLegacyInactiveReason */
export const isCrmInactiveReason = isCrmLegacyInactiveReason;

/** @deprecated Use getCrmLossReasonLabel / getCrmLegacyInactiveReasonLabel */
export const getCrmInactiveReasonLabel = getCrmLegacyInactiveReasonLabel;

/** @deprecated Use resolveCrmProjectListSortRank */
export const resolveCrmSubprojectListSortRank = resolveCrmProjectListSortRank;

/** @deprecated Prefer deriveCrmProjectStatusFromLegacy */
export function deriveCrmSubprojectStatus(input: {
  readonly priority: CrmPriority;
  readonly completedAt: string | null;
  readonly explicitStatus?: CrmLegacySubprojectStatus | null;
}): CrmLegacySubprojectStatus {
  if (input.explicitStatus === 'inactive') return 'inactive';
  if (input.completedAt != null || input.explicitStatus === 'completed') return 'completed';
  if (isProjectPriorityUrgent(input.priority) || input.explicitStatus === 'urgent') return 'urgent';
  return 'normal';
}
