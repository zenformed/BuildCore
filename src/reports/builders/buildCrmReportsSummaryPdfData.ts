import {
  CRM_BUDGET_CATEGORIES,
  type CrmBudgetCategory,
  type CrmProjectDetail,
} from '@/domain/crm';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatBuildCoreDisplayDateFromDate,
  formatBuildCoreDisplayDateTimeFromDate,
} from '@/platform/formatting/buildCoreDisplayDate';
import {
  collectPaymentTasks,
  computeReportsFinancialColumnTotals,
  sumCollectedInRange,
  sumCostsByCategoryInRange,
} from '../calculations/reportsFinancialMetrics';
import {
  computePercentOfCost,
  computePercentOfSales,
} from '../calculations/reportsPercentOfSales';
import { resolveReportsSummaryColumnRanges } from '../calculations/reportsSummaryPeriodRanges';
import {
  buildReportsSummaryColumnHeaders,
  buildReportsSummaryYearContext,
} from '../calculations/reportsSummaryYearContext';
import { reportBudgetCategoryLabel } from '../labels/reportLabels';
import type {
  CrmReportsSummaryPdfContext,
  CrmReportsSummaryPdfData,
  ReportsSummaryPdfBlock,
  ReportsSummaryPdfColumn,
  ReportsSummaryPdfDetailLine,
  ReportsSummaryPdfMetricCells,
  ReportsSummaryPdfSection,
  ReportsSummaryPdfSummaryLine,
} from '../types/crmReportsSummaryPdf';

/** Reserved for future back-office overhead (not project-tied). */
const OPERATING_EXPENSES_CENTS = 0;

const pdf = content.reports.summaryPdf;

function buildCells(
  columns: readonly ReportsSummaryPdfColumn[],
  amountForColumn: (column: ReportsSummaryPdfColumn) => number,
  percentForColumn: (column: ReportsSummaryPdfColumn, amountCents: number) => number
): ReportsSummaryPdfMetricCells {
  const cells = {} as ReportsSummaryPdfMetricCells;
  for (const column of columns) {
    const amountCents = amountForColumn(column);
    cells[column.key] = {
      amountCents,
      percent: percentForColumn(column, amountCents),
    };
  }
  return cells;
}

function revenuePercent(column: ReportsSummaryPdfColumn, amountCents: number): number {
  return computePercentOfSales(amountCents, column.revenueCents);
}

function costSharePercent(column: ReportsSummaryPdfColumn, amountCents: number): number {
  return computePercentOfCost(amountCents, column.costCents);
}

function categoriesWithSpend(
  projects: readonly CrmProjectDetail[],
  ranges: ReturnType<typeof resolveReportsSummaryColumnRanges>
): CrmBudgetCategory[] {
  const seen = new Set<CrmBudgetCategory>();
  for (const range of ranges) {
    const byCategory = sumCostsByCategoryInRange(projects, range.start, range.end);
    for (const [category, cents] of byCategory) {
      if (cents > 0) seen.add(category);
    }
  }
  return CRM_BUDGET_CATEGORIES.filter((category) => seen.has(category));
}

function buildRevenueSection(
  projects: readonly CrmProjectDetail[],
  columns: readonly ReportsSummaryPdfColumn[],
  ranges: ReturnType<typeof resolveReportsSummaryColumnRanges>
): ReportsSummaryPdfSection {
  const payments = collectPaymentTasks(projects);
  const details: ReportsSummaryPdfDetailLine[] = [
    {
      label: pdf.collectedRevenue,
      cells: buildCells(
        columns,
        (column) => {
          const range = ranges.find((r) => r.key === column.key);
          if (!range) return 0;
          return sumCollectedInRange(payments, range.start, range.end);
        },
        revenuePercent
      ),
    },
  ];

  return {
    id: 'revenue',
    title: pdf.revenue,
    details,
    totalLabel: pdf.totalRevenue,
    total: buildCells(columns, (column) => column.revenueCents, revenuePercent),
  };
}

function buildCogsSection(
  projects: readonly CrmProjectDetail[],
  columns: readonly ReportsSummaryPdfColumn[],
  ranges: ReturnType<typeof resolveReportsSummaryColumnRanges>
): ReportsSummaryPdfSection {
  const categories = categoriesWithSpend(projects, ranges);
  const details: ReportsSummaryPdfDetailLine[] = categories.map((category) => ({
    label: reportBudgetCategoryLabel(category),
    cells: buildCells(
      columns,
      (column) => {
        const range = ranges.find((r) => r.key === column.key);
        if (!range) return 0;
        return sumCostsByCategoryInRange(projects, range.start, range.end).get(category) ?? 0;
      },
      costSharePercent
    ),
  }));

  return {
    id: 'cogs',
    title: pdf.costOfGoodsSold,
    details,
    totalLabel: pdf.totalCostOfGoodsSold,
    total: buildCells(columns, (column) => column.costCents, revenuePercent),
  };
}

function buildOperatingExpensesSection(
  columns: readonly ReportsSummaryPdfColumn[]
): ReportsSummaryPdfSection {
  const zeroCells = buildCells(columns, () => 0, revenuePercent);

  return {
    id: 'operatingExpenses',
    title: pdf.operatingExpenses,
    details: [],
    totalLabel: pdf.totalOperatingExpenses,
    total: zeroCells,
  };
}

function buildGrossMarginLine(
  columns: readonly ReportsSummaryPdfColumn[]
): ReportsSummaryPdfSummaryLine {
  return {
    id: 'grossMargin',
    label: pdf.grossMargin,
    cells: buildCells(
      columns,
      (column) => column.revenueCents - column.costCents,
      revenuePercent
    ),
  };
}

function buildNetProfitLine(
  columns: readonly ReportsSummaryPdfColumn[]
): ReportsSummaryPdfSummaryLine {
  return {
    id: 'netProfit',
    label: pdf.netProfit,
    cells: buildCells(
      columns,
      (column) =>
        column.revenueCents - column.costCents - OPERATING_EXPENSES_CENTS,
      revenuePercent
    ),
  };
}

function buildBlocks(
  projects: readonly CrmProjectDetail[],
  columns: readonly ReportsSummaryPdfColumn[],
  ranges: ReturnType<typeof resolveReportsSummaryColumnRanges>
): readonly ReportsSummaryPdfBlock[] {
  return [
    { kind: 'section', section: buildRevenueSection(projects, columns, ranges) },
    { kind: 'section', section: buildCogsSection(projects, columns, ranges) },
    { kind: 'summary', line: buildGrossMarginLine(columns) },
    { kind: 'section', section: buildOperatingExpensesSection(columns) },
    { kind: 'summary', line: buildNetProfitLine(columns) },
  ];
}

function formatGeneratedAt(date: Date): string {
  return formatBuildCoreDisplayDateTimeFromDate(date);
}

function formatAsOf(date: Date): string {
  return formatBuildCoreDisplayDateFromDate(date);
}

export function buildCrmReportsSummaryReportTitle(organizationName: string): string {
  const name = organizationName.trim() || buildcoreAppDefinition.displayName;
  return `${name} — Financial Summary`;
}

export function buildCrmReportsSummaryPdfData(
  projects: readonly CrmProjectDetail[],
  context: CrmReportsSummaryPdfContext,
  now: Date = new Date()
): CrmReportsSummaryPdfData {
  const ranges = resolveReportsSummaryColumnRanges(now);
  const { currentYear, priorYear, yearContextLine } = buildReportsSummaryYearContext(now);
  const columns: ReportsSummaryPdfColumn[] = ranges.map((range) => {
    const totals = computeReportsFinancialColumnTotals(projects, range.start, range.end);
    return {
      key: range.key,
      revenueCents: totals.revenueCents,
      costCents: totals.costCents,
    };
  });

  return {
    organizationName: context.organizationName.trim() || buildcoreAppDefinition.displayName,
    reportTitle: buildCrmReportsSummaryReportTitle(context.organizationName),
    periodId: context.periodId,
    currentYear,
    priorYear,
    yearContextLine,
    generatedAtLabel: formatGeneratedAt(now),
    asOfLabel: formatAsOf(now),
    footerNote: pdf.footerNote,
    columnHeaders: buildReportsSummaryColumnHeaders(priorYear),
    columns,
    blocks: buildBlocks(projects, columns, ranges),
  };
}
