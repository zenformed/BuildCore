import type { CrmProjectStatus } from '@/domain/crm';
import {
  CRM_PROJECT_STATUS_OPTIONS,
  getCrmProjectStatusLabel,
} from '@/domain/crm';
import type { SetCrmProjectsStatusResult } from '@/domain/crm/setCrmProjectsStatus';

/** CSS module suffix for overview status badge / pill. */
export type CrmProjectStatusBadgeTone = CrmProjectStatus;

export function resolveCrmProjectStatusBadgeTone(
  status: CrmProjectStatus
): CrmProjectStatusBadgeTone {
  return status;
}

export function resolveCrmProjectStatusPillLabel(status: CrmProjectStatus): string {
  return getCrmProjectStatusLabel(status);
}

export function listCrmProjectStatusMenuOptions(
  currentStatus: CrmProjectStatus
): readonly {
  readonly value: CrmProjectStatus;
  readonly label: string;
  readonly selected: boolean;
}[] {
  return CRM_PROJECT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    selected: option.value === currentStatus,
  }));
}

export type InterpretSetCrmProjectsStatusOutcome =
  | { readonly kind: 'success'; readonly resultingStatus: CrmProjectStatus | null }
  | { readonly kind: 'noop' }
  | { readonly kind: 'confirmation_required'; readonly incompleteTaskCount: number }
  | { readonly kind: 'failure'; readonly message: string };

/**
 * Interprets a unified status API result for a single detail-page slug.
 * Does not throw for expected confirmation_required outcomes.
 */
export function interpretSetCrmProjectsStatusResult(
  result: SetCrmProjectsStatusResult,
  projectSlug: string,
  fallbackFailureMessage: string
): InterpretSetCrmProjectsStatusOutcome {
  const item =
    result.results.find((entry) => entry.slug === projectSlug) ?? result.results[0] ?? null;
  if (item == null) {
    if (result.updatedCount > 0) {
      return { kind: 'success', resultingStatus: null };
    }
    return { kind: 'failure', message: fallbackFailureMessage };
  }
  if (item.failureCode === 'confirmation_required') {
    const count =
      typeof item.incompleteTaskCount === 'number' && item.incompleteTaskCount > 0
        ? Math.floor(item.incompleteTaskCount)
        : 1;
    return { kind: 'confirmation_required', incompleteTaskCount: count };
  }
  if (item.failureCode === 'already_at_status') {
    return { kind: 'noop' };
  }
  if (item.success) {
    return { kind: 'success', resultingStatus: item.resultingStatus };
  }
  return {
    kind: 'failure',
    message: item.message?.trim() || fallbackFailureMessage,
  };
}
