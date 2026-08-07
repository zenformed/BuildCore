import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';

export type CrmProjectCompletionConfirmationRequired = {
  readonly incompleteTaskCount: number;
};

export function isCrmProjectCompletionConfirmationRequired(
  error: unknown
): error is CrmApiError & CrmProjectCompletionConfirmationRequired {
  if (!(error instanceof CrmApiError)) return false;
  if (error.code !== 'confirmation_required' && error.code !== 'completion_blocked') {
    return false;
  }
  return true;
}

export function incompleteTaskCountFromConfirmationError(error: CrmApiError): number {
  const raw = error.details.incompleteTaskCount;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  // Fallback: parse "still has N incomplete" from message when details missing.
  const match = /still has (\d+) incomplete/i.exec(error.message);
  if (match?.[1] != null) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 1;
}
