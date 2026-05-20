import type { CrmProjectSummary } from './project';

/** True when the project/customer has been marked complete. */
export function isCrmProjectComplete(summary: Pick<CrmProjectSummary, 'completedAt'>): boolean {
  return summary.completedAt != null;
}

export type SetCrmProjectCompletionInput = {
  readonly complete: boolean;
};
