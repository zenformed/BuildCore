import type {
  CrmAccountabilityAction,
  CrmBudgetEntry,
  CrmWorkflowTask,
} from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm';
import { formatBudgetCategory } from './budgetCategoryLabels';
import {
  formatDocumentKind,
  formatWorkflowStageLabel,
  formatWorkflowStatus,
  formatWorkflowTaskStageLabel,
} from './crmProjectDetailFormatters';
import type { DocumentListItem } from './documentPanelModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';

function normalizeSearchQuery(searchQuery: string): string {
  return searchQuery.trim().toLowerCase();
}

function haystackIncludes(haystack: string, query: string): boolean {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

function joinHaystack(values: readonly (string | null | undefined)[]): string {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}

export function filterWorkflowTasksBySearch(
  tasks: readonly CrmWorkflowTask[],
  searchQuery: string
): CrmWorkflowTask[] {
  const query = normalizeSearchQuery(searchQuery);
  if (!query) return [...tasks];

  return tasks.filter((task) => {
    if (isPaymentWorkflowTask(task)) return false;
    const haystack = joinHaystack([
      task.title,
      task.notes,
      formatWorkflowStatus(task.status),
      formatWorkflowStageLabel(task.stageSlug),
      task.assignedTo?.displayName,
      task.dueAt,
      task.completedAt,
    ]);
    return haystackIncludes(haystack, query);
  });
}

export function filterPaymentMilestonesBySearch(
  milestones: readonly CrmWorkflowTask[],
  searchQuery: string
): CrmWorkflowTask[] {
  const query = normalizeSearchQuery(searchQuery);
  if (!query) return [...milestones];

  return milestones.filter((task) => {
    const haystack = joinHaystack([
      task.title,
      task.notes,
      formatWorkflowStatus(task.status),
      task.assignedTo?.displayName,
      task.amountCents != null ? formatCentsAsUsd(task.amountCents) : null,
      task.dueAt,
      task.invoicedAt,
      task.paidAt,
    ]);
    return haystackIncludes(haystack, query);
  });
}

export function filterBudgetEntriesBySearch(
  entries: readonly CrmBudgetEntry[],
  searchQuery: string
): CrmBudgetEntry[] {
  const query = normalizeSearchQuery(searchQuery);
  if (!query) return [...entries];

  return entries.filter((entry) => {
    const haystack = joinHaystack([
      entry.itemName,
      entry.notes,
      formatBudgetCategory(entry.category),
      entry.assignedTo?.displayName,
      formatCentsAsUsd(entry.costCents),
      formatCentsAsUsd(entry.budgetCents),
      entry.costIncurredAt,
    ]);
    return haystackIncludes(haystack, query);
  });
}

export function filterDocumentPanelItemsBySearch(
  items: readonly DocumentListItem[],
  searchQuery: string
): DocumentListItem[] {
  const query = normalizeSearchQuery(searchQuery);
  if (!query) return [...items];

  return items.filter((item) => {
    if (item.kind === 'missing') {
      const haystack = joinHaystack([
        item.task.title,
        formatWorkflowTaskStageLabel(item.task),
        'missing',
        'required',
      ]);
      return haystackIncludes(haystack, query);
    }

    const haystack = joinHaystack([
      item.document.name,
      formatDocumentKind(item.document.kind),
      item.document.mimeType,
    ]);
    return haystackIncludes(haystack, query);
  });
}

export function filterAccountabilityEntriesBySearch(
  entries: readonly CrmAccountabilityAction[],
  searchQuery: string
): CrmAccountabilityAction[] {
  const query = normalizeSearchQuery(searchQuery);
  if (!query) return [...entries];

  return entries.filter((entry) => {
    const haystack = joinHaystack([
      entry.action,
      entry.actor.displayName,
      entry.stageSlug ? formatWorkflowStageLabel(entry.stageSlug) : null,
      entry.at,
    ]);
    return haystackIncludes(haystack, query);
  });
}
