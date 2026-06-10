import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import { buildMockProjectBudgetEntriesIndex } from '@/infrastructure/crm/mock/buildMockProjectBudgetEntriesIndex';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function loadCrmProjectBudgetEntriesIndex(
  repos: CrmRepositories
): Promise<CrmProjectBudgetEntriesIndex> {
  return resolveCrmRepositoryResult(repos.projects.listBudgetEntries());
}

export function loadCrmProjectBudgetEntriesIndexSync(
  repos: CrmRepositories
): CrmProjectBudgetEntriesIndex {
  const result = repos.projects.listBudgetEntries();
  if (result instanceof Promise) {
    return buildMockProjectBudgetEntriesIndex();
  }
  return result;
}
