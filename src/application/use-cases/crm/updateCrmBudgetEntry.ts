import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmBudgetEntry } from '@/domain/crm';
import type { UpdateCrmBudgetEntryInput } from '@/domain/crm/budgetMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function updateCrmBudgetEntry(
  repositories: CrmRepositories,
  input: UpdateCrmBudgetEntryInput
): Promise<CrmBudgetEntry | null> {
  return resolveCrmRepositoryResult(repositories.budget.update(input));
}
