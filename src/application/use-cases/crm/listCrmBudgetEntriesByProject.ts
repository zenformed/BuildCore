import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmBudgetEntry } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export type ListCrmBudgetEntriesByProjectInput = {
  readonly projectId: string;
  readonly projectSlug: string;
};

export async function listCrmBudgetEntriesByProject(
  repositories: CrmRepositories,
  input: ListCrmBudgetEntriesByProjectInput
): Promise<readonly CrmBudgetEntry[]> {
  return resolveCrmRepositoryResult(repositories.budget.listByProject(input));
}
