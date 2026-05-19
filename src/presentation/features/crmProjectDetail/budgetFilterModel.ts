import type { CrmBudgetCategory, CrmBudgetEntry } from '@/domain/crm';
import { CRM_BUDGET_FILTER_CATEGORIES } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from './budgetCategoryLabels';

export type BudgetTableFilter = 'all' | CrmBudgetCategory;

export const BUDGET_TABLE_FILTERS: readonly { id: BudgetTableFilter; label: string }[] = [
  { id: 'all', label: content.projectDetail.documents.filters.all },
  ...CRM_BUDGET_FILTER_CATEGORIES.map((id) => ({
    id,
    label: formatBudgetCategory(id),
  })),
];

export function filterBudgetEntries(
  entries: readonly CrmBudgetEntry[],
  filter: BudgetTableFilter
): CrmBudgetEntry[] {
  if (filter === 'all') return [...entries];
  return entries.filter((entry) => entry.category === filter);
}
