import type { CrmPriority, CrmProjectSummary } from './project';
import { isCrmProjectComplete } from './projectCompletion';
import { isProjectPriorityUrgent } from './projectPriorityToggle';

/** Subproject lifecycle status — independent of priority, stage, and archived. */
export type CrmSubprojectStatus = 'urgent' | 'normal' | 'completed' | 'inactive';

export const CRM_SUBPROJECT_STATUS_VALUES: readonly CrmSubprojectStatus[] = [
  'urgent',
  'normal',
  'completed',
  'inactive',
] as const;

export type CrmInactiveReason =
  | 'chose_competitor'
  | 'price'
  | 'no_response'
  | 'project_canceled'
  | 'outside_service_area'
  | 'not_qualified'
  | 'duplicate'
  | 'other';

export const CRM_INACTIVE_REASON_VALUES: readonly CrmInactiveReason[] = [
  'chose_competitor',
  'price',
  'no_response',
  'project_canceled',
  'outside_service_area',
  'not_qualified',
  'duplicate',
  'other',
] as const;

export type CrmInactiveReasonOption = {
  readonly value: CrmInactiveReason;
  readonly label: string;
};

export const CRM_INACTIVE_REASON_OPTIONS: readonly CrmInactiveReasonOption[] = [
  { value: 'chose_competitor', label: 'Chose another competitor' },
  { value: 'price', label: 'Price' },
  { value: 'no_response', label: 'No response' },
  { value: 'project_canceled', label: 'Project canceled' },
  { value: 'outside_service_area', label: 'Outside service area' },
  { value: 'not_qualified', label: 'Not qualified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

export function isCrmSubprojectStatus(value: string): value is CrmSubprojectStatus {
  return (CRM_SUBPROJECT_STATUS_VALUES as readonly string[]).includes(value);
}

export function isCrmInactiveReason(value: string): value is CrmInactiveReason {
  return (CRM_INACTIVE_REASON_VALUES as readonly string[]).includes(value);
}

export function isCrmProjectInactive(project: Pick<CrmProjectSummary, 'subprojectStatus'>): boolean {
  return project.subprojectStatus === 'inactive';
}

export function getCrmInactiveReasonLabel(
  reason: CrmInactiveReason,
  customReason: string | null
): string {
  if (reason === 'other') {
    const trimmed = customReason?.trim();
    return trimmed ? trimmed : 'Other';
  }
  const match = CRM_INACTIVE_REASON_OPTIONS.find((option) => option.value === reason);
  return match?.label ?? reason;
}

/** Derive lifecycle status from legacy priority/completion when not explicitly inactive. */
export function deriveCrmSubprojectStatus(input: {
  readonly priority: CrmPriority;
  readonly completedAt: string | null;
  readonly explicitStatus?: CrmSubprojectStatus | null;
}): CrmSubprojectStatus {
  if (input.explicitStatus === 'inactive') return 'inactive';
  if (input.completedAt != null || input.explicitStatus === 'completed') return 'completed';
  if (isProjectPriorityUrgent(input.priority) || input.explicitStatus === 'urgent') return 'urgent';
  return 'normal';
}

export function resolveCrmSubprojectListSortRank(
  project: Pick<CrmProjectSummary, 'subprojectStatus' | 'priority' | 'completedAt'>
): number {
  if (project.subprojectStatus === 'inactive') return 3;
  if (project.subprojectStatus === 'completed' || isCrmProjectComplete(project)) return 2;
  if (project.subprojectStatus === 'urgent' || isProjectPriorityUrgent(project.priority)) return 0;
  return 1;
}

export type MarkCrmProjectsInactiveInput = {
  readonly projectSlugs: readonly string[];
  readonly reason: CrmInactiveReason;
  readonly customReason?: string | null;
};

export type MarkCrmProjectsActiveInput = {
  readonly projectSlugs: readonly string[];
};

export function validateMarkCrmProjectsInactiveInput(input: MarkCrmProjectsInactiveInput): string | null {
  if (input.projectSlugs.length === 0) {
    return 'At least one project is required.';
  }
  if (!isCrmInactiveReason(input.reason)) {
    return 'A valid inactive reason is required.';
  }
  if (input.reason === 'other' && !input.customReason?.trim()) {
    return 'Custom reason is required when Other is selected.';
  }
  return null;
}
