import type { CrmBudgetEntry } from '@/domain/crm';
import type {
  CreateCrmBudgetEntryInput,
  DeleteCrmBudgetEntryInput,
  UpdateCrmBudgetEntryInput,
} from '@/domain/crm/budgetMutations';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export type ListCrmBudgetEntriesByProjectRepoInput = {
  readonly projectId: string;
  readonly projectSlug: string;
};

export interface ICrmBudgetRepository {
  listByProject(
    input: ListCrmBudgetEntriesByProjectRepoInput
  ): CrmRepositoryResult<readonly CrmBudgetEntry[]>;
  create(input: CreateCrmBudgetEntryInput): CrmRepositoryResult<CrmBudgetEntry>;
  update(input: UpdateCrmBudgetEntryInput): CrmRepositoryResult<CrmBudgetEntry | null>;
  delete(input: DeleteCrmBudgetEntryInput): CrmRepositoryResult<boolean>;
}
