import type { CrmBudgetCategory, CrmBudgetEntry } from '@/domain/crm';
import { CRM_BUDGET_FILTER_CATEGORIES } from '@/domain/crm';
import type { CrmDocumentsRequiredFilterValue } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { formatBudgetCategory } from './budgetCategoryLabels';

export type BudgetListFilters = {
  readonly categories: readonly CrmBudgetCategory[];
  readonly documentsRequired: readonly CrmDocumentsRequiredFilterValue[];
};

export const EMPTY_BUDGET_LIST_FILTERS: BudgetListFilters = {
  categories: [],
  documentsRequired: [],
};

export const BUDGET_CATEGORY_FILTER_OPTIONS: readonly {
  id: CrmBudgetCategory;
  label: string;
}[] = CRM_BUDGET_FILTER_CATEGORIES.map((id) => ({
  id,
  label: formatBudgetCategory(id),
}));

export function isBudgetListFiltersActive(filters: BudgetListFilters): boolean {
  return filters.categories.length > 0 || filters.documentsRequired.length > 0;
}

export function filterBudgetEntriesByListFilters(
  entries: readonly CrmBudgetEntry[],
  filters: BudgetListFilters
): CrmBudgetEntry[] {
  if (!isBudgetListFiltersActive(filters)) return [...entries];

  return entries.filter((entry) => {
    if (filters.categories.length > 0 && !filters.categories.includes(entry.category)) {
      return false;
    }
    if (filters.documentsRequired.length > 0) {
      const value: CrmDocumentsRequiredFilterValue = entry.documentsRequired ? 'yes' : 'no';
      if (!filters.documentsRequired.includes(value)) return false;
    }
    return true;
  });
}
