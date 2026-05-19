import type { CrmBudgetCategory, CrmPriority } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

const categoryLabels = content.projectDetail.budget.categoryLabels;

export function reportBudgetCategoryLabel(category: CrmBudgetCategory): string {
  return categoryLabels[category] ?? category;
}

const PRIORITY_LABELS: Record<CrmPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export function reportPriorityLabel(priority: CrmPriority): string {
  return PRIORITY_LABELS[priority];
}
