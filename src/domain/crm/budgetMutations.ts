import type { CrmBudgetCategory } from './budget';

export type CreateCrmBudgetEntryInput = {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly itemName: string;
  readonly category: CrmBudgetCategory;
  readonly costCents: number;
  readonly budgetCents: number;
  readonly notes?: string | null;
  readonly assignedMemberId?: string | null;
  readonly occurredOn?: string | null;
  readonly documentsRequired?: boolean;
};

export type UpdateCrmBudgetEntryInput = {
  readonly entryId: string;
  readonly projectSlug: string;
  readonly itemName?: string;
  readonly category?: CrmBudgetCategory;
  readonly costCents?: number;
  readonly budgetCents?: number;
  readonly notes?: string | null;
  readonly assignedMemberId?: string | null;
  readonly occurredOn?: string | null;
  readonly documentsRequired?: boolean;
};

export type DeleteCrmBudgetEntryInput = {
  readonly entryId: string;
  readonly projectSlug: string;
};
