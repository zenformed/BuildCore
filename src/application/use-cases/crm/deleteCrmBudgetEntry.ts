import type { CrmRepositories } from '@/application/ports/crm';
import type { DeleteCrmBudgetEntryInput } from '@/domain/crm/budgetMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function deleteCrmBudgetEntry(
  repositories: CrmRepositories,
  input: DeleteCrmBudgetEntryInput
): Promise<boolean> {
  return resolveCrmRepositoryResult(repositories.budget.delete(input));
}
