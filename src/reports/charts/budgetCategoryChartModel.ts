import type { CrmBudgetCategory, CrmBudgetCategoryCost } from '@/domain/crm';

export const BUDGET_PIE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#eab308',
  '#64748b',
  '#0ea5e9',
] as const;

export type BudgetCategoryPieSlice = {
  readonly row: CrmBudgetCategoryCost;
  readonly fraction: number;
  readonly start: number;
  readonly color: string;
};

export function buildBudgetCategoryPieSlices(
  categoryCosts: readonly CrmBudgetCategoryCost[]
): { total: number; slices: BudgetCategoryPieSlice[] } {
  const total = categoryCosts.reduce((sum, row) => sum + row.costCents, 0);
  if (total <= 0) return { total: 0, slices: [] };

  let cursor = 0;
  const slices: BudgetCategoryPieSlice[] = categoryCosts.map((row, index) => {
    const fraction = row.costCents / total;
    const start = cursor;
    cursor += fraction;
    return {
      row,
      fraction,
      start,
      color: BUDGET_PIE_COLORS[index % BUDGET_PIE_COLORS.length],
    };
  });

  return { total, slices };
}

export function budgetCategoryColorByCategory(
  slices: readonly BudgetCategoryPieSlice[]
): ReadonlyMap<CrmBudgetCategory, string> {
  return new Map(slices.map((slice) => [slice.row.category, slice.color] as const));
}
