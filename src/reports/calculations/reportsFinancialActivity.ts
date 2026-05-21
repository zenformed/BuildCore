import {
  isPaymentWorkflowTask,
  type CrmBudgetCategory,
  type CrmDocumentKind,
  type CrmProjectDetail,
} from '@/domain/crm';
import { reportBudgetCategoryLabel } from '../labels/reportLabels';
import type { ReportsFinancialActivityItem } from '../types/crmReportsDashboard';
import { isTimestampInRange } from './reportPeriodRange';

const MAX_ACTIVITY_ITEMS = 48;

function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatActivityTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function pushEvent(
  bucket: ReportsFinancialActivityItem[],
  input: {
    id: string;
    at: string;
    projectSlug: string;
    projectName: string;
    action: string;
    amountCents?: number;
  }
): void {
  const amountPrefix =
    input.amountCents != null && input.amountCents > 0
      ? `${formatUsdFromCents(input.amountCents)} `
      : '';
  bucket.push({
    id: input.id,
    occurredAt: input.at,
    displayAt: formatActivityTimestamp(input.at),
    projectSlug: input.projectSlug,
    projectName: input.projectName,
    summary: `${amountPrefix}${input.action} — ${input.projectName}`,
  });
}

function documentActionLabel(kind: CrmDocumentKind): string {
  if (kind === 'invoice') return 'invoice uploaded';
  return 'document uploaded';
}

function categoryExpenseLabel(category: CrmBudgetCategory, itemName: string): string {
  const categoryLabel = reportBudgetCategoryLabel(category).toLowerCase();
  const trimmed = itemName.trim();
  if (!trimmed) return `${categoryLabel} expense added`;
  return `${categoryLabel} expense added (${trimmed})`;
}

/** Build a newest-first activity feed from project payments, costs, and documents in range. */
export function buildReportsFinancialActivity(
  projects: readonly CrmProjectDetail[],
  rangeStart: Date,
  rangeEnd: Date
): readonly ReportsFinancialActivityItem[] {
  const items: ReportsFinancialActivityItem[] = [];
  const now = Date.now();

  for (const project of projects) {
    const { slug, name } = project.summary;

    for (const task of project.workflowTasks) {
      if (!isPaymentWorkflowTask(task)) continue;
      const amount = task.amountCents ?? 0;

      if (task.paidAt != null && isTimestampInRange(task.paidAt, rangeStart, rangeEnd)) {
        pushEvent(items, {
          id: `paid-${task.id}`,
          at: task.paidAt,
          projectSlug: slug,
          projectName: name,
          action: 'payment received',
          amountCents: amount,
        });
      }

      if (
        task.invoicedAt != null &&
        isTimestampInRange(task.invoicedAt, rangeStart, rangeEnd) &&
        task.paidAt !== task.invoicedAt
      ) {
        pushEvent(items, {
          id: `invoiced-${task.id}`,
          at: task.invoicedAt,
          projectSlug: slug,
          projectName: name,
          action: task.paidAt != null ? 'invoice recorded' : 'payment invoiced',
          amountCents: amount,
        });
      }

      if (
        task.invoicedAt != null &&
        task.paidAt == null &&
        task.dueAt != null &&
        isTimestampInRange(task.dueAt, rangeStart, rangeEnd)
      ) {
        const dueMs = new Date(task.dueAt).getTime();
        if (!Number.isNaN(dueMs) && dueMs < now) {
          pushEvent(items, {
            id: `overdue-${task.id}`,
            at: task.dueAt,
            projectSlug: slug,
            projectName: name,
            action: 'payment marked overdue',
            amountCents: amount,
          });
        }
      }
    }

    for (const entry of project.budget.entries) {
      const at = entry.costIncurredAt || entry.createdAt;
      if (!isTimestampInRange(at, rangeStart, rangeEnd)) continue;
      pushEvent(items, {
        id: `cost-${entry.id}`,
        at,
        projectSlug: slug,
        projectName: name,
        action: categoryExpenseLabel(entry.category, entry.itemName),
        amountCents: entry.costCents,
      });
    }

    for (const doc of project.documents) {
      if (!isTimestampInRange(doc.uploadedAt, rangeStart, rangeEnd)) continue;
      pushEvent(items, {
        id: `doc-${doc.id}`,
        at: doc.uploadedAt,
        projectSlug: slug,
        projectName: name,
        action: documentActionLabel(doc.kind),
      });
    }

    for (const log of project.accountabilityLog) {
      if (!isTimestampInRange(log.at, rangeStart, rangeEnd)) continue;
      items.push({
        id: `log-${log.id}`,
        occurredAt: log.at,
        displayAt: formatActivityTimestamp(log.at),
        projectSlug: slug,
        projectName: name,
        summary: `${log.action} — ${name}`,
      });
    }
  }

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return items.slice(0, MAX_ACTIVITY_ITEMS);
}
