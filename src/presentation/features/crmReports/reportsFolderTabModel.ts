import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ReportPeriodId } from '@/reports/types/crmReportsDashboard';

export type ReportsFolderTabId =
  | 'graphs'
  | 'costBreakdown'
  | 'projectPerformance'
  | 'recentActivity';

export type ReportsFolderTabDef = {
  readonly id: ReportsFolderTabId;
  readonly label: string;
};

export const REPORT_PERIOD_IDS: readonly ReportPeriodId[] = ['mtd', 'qtd', 'ytd', 'all'];

export function buildReportsFolderTabs(): readonly ReportsFolderTabDef[] {
  const sections = content.reports.sections;
  return [
    { id: 'graphs', label: 'Graphs' },
    { id: 'costBreakdown', label: sections.costBreakdown },
    { id: 'projectPerformance', label: sections.projectPerformance },
    { id: 'recentActivity', label: 'Recent Activity' },
  ];
}
