import type { CrmProjectStatus } from '@/domain/crm';
import { getCrmProjectStatusLabel } from '@/domain/crm';
import type { SetCrmProjectsStatusResult } from '@/domain/crm/setCrmProjectsStatus';

export type InterpretBulkSetCrmProjectsStatusOutcome =
  | {
      readonly kind: 'success';
      readonly updatedCount: number;
      readonly resultingStatus: CrmProjectStatus;
    }
  | {
      readonly kind: 'partial';
      readonly updatedCount: number;
      readonly failedCount: number;
      readonly message: string;
      readonly resultingStatus: CrmProjectStatus;
    }
  | {
      readonly kind: 'confirmation_required';
      readonly incompleteTaskCount: number;
      readonly pendingSlugCount: number;
    }
  | { readonly kind: 'noop' }
  | { readonly kind: 'failure'; readonly message: string };

/**
 * Interprets a unified status API bulk result for table Change Status.
 * Any confirmation_required row opens the incomplete-tasks warning (no client loops).
 */
export function interpretBulkSetCrmProjectsStatusResult(
  result: SetCrmProjectsStatusResult,
  requestedStatus: CrmProjectStatus,
  fallbackFailureMessage: string
): InterpretBulkSetCrmProjectsStatusOutcome {
  const confirmationRows = result.results.filter(
    (entry) => entry.failureCode === 'confirmation_required'
  );
  if (confirmationRows.length > 0) {
    let incompleteTaskCount = 0;
    for (const row of confirmationRows) {
      const n =
        typeof row.incompleteTaskCount === 'number' && row.incompleteTaskCount > 0
          ? Math.floor(row.incompleteTaskCount)
          : 1;
      incompleteTaskCount += n;
    }
    return {
      kind: 'confirmation_required',
      incompleteTaskCount: Math.max(1, incompleteTaskCount),
      pendingSlugCount: confirmationRows.length,
    };
  }

  const hardFailures = result.results.filter(
    (entry) =>
      !entry.success &&
      entry.failureCode !== 'already_at_status' &&
      entry.failureCode !== 'confirmation_required'
  );
  const updatedCount = result.updatedCount;
  const noopOnly =
    updatedCount === 0 &&
    hardFailures.length === 0 &&
    result.results.every(
      (entry) => entry.success || entry.failureCode === 'already_at_status'
    );

  if (noopOnly) {
    return { kind: 'noop' };
  }

  if (hardFailures.length > 0 && updatedCount === 0) {
    return {
      kind: 'failure',
      message: hardFailures[0]?.message?.trim() || fallbackFailureMessage,
    };
  }

  if (hardFailures.length > 0) {
    return {
      kind: 'partial',
      updatedCount,
      failedCount: hardFailures.length,
      message: hardFailures[0]?.message?.trim() || fallbackFailureMessage,
      resultingStatus: requestedStatus,
    };
  }

  if (updatedCount > 0) {
    return {
      kind: 'success',
      updatedCount,
      resultingStatus: requestedStatus,
    };
  }

  return { kind: 'failure', message: fallbackFailureMessage };
}

export function formatBulkCrmProjectStatusSuccessMessage(
  status: CrmProjectStatus,
  updatedCount: number,
  copy: {
    readonly success: (statusLabel: string) => string;
    readonly bulkSuccess: (statusLabel: string, count: number) => string;
  }
): string {
  const label = getCrmProjectStatusLabel(status);
  if (updatedCount <= 1) return copy.success(label);
  return copy.bulkSuccess(label, updatedCount);
}
