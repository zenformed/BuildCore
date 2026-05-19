import type { CrmTeamMemberRef } from './teamMember';

export type CrmBudgetCategory =
  | 'labor'
  | 'materials'
  | 'equipment'
  | 'subcontractors'
  | 'permits'
  | 'travel'
  | 'lodging'
  | 'per_diem'
  | 'fuel'
  | 'dump_disposal'
  | 'rental_fees'
  | 'insurance'
  | 'office_admin'
  | 'other';

export const CRM_BUDGET_CATEGORIES: readonly CrmBudgetCategory[] = [
  'labor',
  'materials',
  'equipment',
  'subcontractors',
  'permits',
  'travel',
  'lodging',
  'per_diem',
  'fuel',
  'dump_disposal',
  'rental_fees',
  'insurance',
  'office_admin',
  'other',
] as const;

/** Categories shown in the filter bar above the budget table. */
export const CRM_BUDGET_FILTER_CATEGORIES: readonly CrmBudgetCategory[] = [
  'labor',
  'materials',
  'equipment',
  'subcontractors',
  'permits',
  'travel',
  'lodging',
  'per_diem',
  'fuel',
  'other',
] as const;

export type CrmBudgetEntry = {
  readonly id: string;
  readonly itemName: string;
  readonly category: CrmBudgetCategory;
  readonly costCents: number;
  readonly budgetCents: number;
  readonly notes: string | null;
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly occurredOn: string | null;
  readonly documentCount: number;
  readonly documentsRequired: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CrmBudgetCategoryCost = {
  readonly category: CrmBudgetCategory;
  readonly costCents: number;
};

export type CrmProjectBudgetSummary = {
  readonly entries: readonly CrmBudgetEntry[];
  readonly totalCostCents: number;
  readonly totalBudgetCents: number;
  /** budget − cost; positive = under budget, negative = over. */
  readonly remainingCents: number;
  readonly categoryCosts: readonly CrmBudgetCategoryCost[];
};

export function buildProjectBudgetSummary(
  entries: readonly CrmBudgetEntry[]
): CrmProjectBudgetSummary {
  let totalCostCents = 0;
  let totalBudgetCents = 0;
  const costByCategory = new Map<CrmBudgetCategory, number>();

  for (const entry of entries) {
    totalCostCents += entry.costCents;
    totalBudgetCents += entry.budgetCents;
    costByCategory.set(entry.category, (costByCategory.get(entry.category) ?? 0) + entry.costCents);
  }

  const categoryCosts: CrmBudgetCategoryCost[] = CRM_BUDGET_CATEGORIES.filter((category) =>
    (costByCategory.get(category) ?? 0) > 0
  ).map((category) => ({
    category,
    costCents: costByCategory.get(category) ?? 0,
  }));

  return {
    entries,
    totalCostCents,
    totalBudgetCents,
    remainingCents: totalBudgetCents - totalCostCents,
    categoryCosts,
  };
}

export function isCrmBudgetCategory(value: string): value is CrmBudgetCategory {
  return (CRM_BUDGET_CATEGORIES as readonly string[]).includes(value);
}
