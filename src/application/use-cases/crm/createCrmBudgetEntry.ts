import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmBudgetEntry } from '@/domain/crm';
import type { CreateCrmBudgetEntryInput } from '@/domain/crm/budgetMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createCrmBudgetEntry(
  repositories: CrmRepositories,
  input: CreateCrmBudgetEntryInput
): Promise<CrmBudgetEntry> {
  return resolveCrmRepositoryResult(repositories.budget.create(input));
}
