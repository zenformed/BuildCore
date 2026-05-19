import type { CrmBudgetCategory } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

const labels = content.projectDetail.budget.categoryLabels;

export function formatBudgetCategory(category: CrmBudgetCategory): string {
  return labels[category] ?? category;
}
