import type { CrmProjectDetail } from '@/domain/crm';
import {
  collectPaymentTasks,
  resolveCostIncurredAtForReporting,
} from './reportsFinancialMetrics';

function addYearFromIso(years: Set<number>, iso: string | null | undefined): void {
  if (iso == null) return;
  const date = new Date(iso);
  if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
}

/** Years with CRM financial activity, newest first; always includes the current calendar year. */
export function listAvailableReportYears(
  projects: readonly CrmProjectDetail[],
  now: Date = new Date()
): number[] {
  const years = new Set<number>();
  years.add(now.getFullYear());

  const payments = collectPaymentTasks(projects);
  for (const payment of payments) {
    addYearFromIso(years, payment.paidAt);
    addYearFromIso(years, payment.invoicedAt);
  }

  for (const project of projects) {
    for (const entry of project.budget.entries) {
      const { iso } = resolveCostIncurredAtForReporting(entry);
      addYearFromIso(years, iso);
    }
  }

  return [...years].sort((a, b) => b - a);
}
