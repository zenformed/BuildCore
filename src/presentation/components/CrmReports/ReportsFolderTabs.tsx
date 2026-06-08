'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import type {
  CrmReportsDashboardData,
  ReportChartTabId,
  ReportPeriodId,
} from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { ReportsCostBreakdownPanel } from './ReportsCostBreakdownPanel';
import { ReportsLineChart } from './ReportsLineChart';
import { ReportsProjectPerformanceSection } from './ReportsProjectPerformanceSection';
import { ReportsRecentActivityPanel } from './ReportsRecentActivityPanel';
import styles from './CrmReports.module.css';

const CHART_TAB_IDS: readonly ReportChartTabId[] = ['revenue', 'profit', 'costs', 'receivables'];

export type ReportsFolderTabId =
  | 'graphs'
  | 'costBreakdown'
  | 'projectPerformance'
  | 'recentActivity';

type FolderTabDef = {
  readonly id: ReportsFolderTabId;
  readonly label: string;
};

export type ReportsFolderTabsProps = {
  readonly dashboard: CrmReportsDashboardData;
  readonly period: ReportPeriodId;
  readonly chartTab: ReportChartTabId;
  readonly onChartTabChange: (tab: ReportChartTabId) => void;
};

export function ReportsFolderTabs({
  dashboard,
  period,
  chartTab,
  onChartTabChange,
}: ReportsFolderTabsProps): ReactElement {
  const [selectedTab, setSelectedTab] = useState<ReportsFolderTabId>('graphs');

  const tabs = useMemo((): readonly FolderTabDef[] => {
    const sections = content.reports.sections;
    return [
      { id: 'graphs', label: 'Graphs' },
      { id: 'costBreakdown', label: sections.costBreakdown },
      { id: 'projectPerformance', label: sections.projectPerformance },
      { id: 'recentActivity', label: 'Recent Activity' },
    ];
  }, []);

  const renderTabPanel = (): ReactElement => {
    switch (selectedTab) {
      case 'graphs':
        return (
          <div className={`${projectStyles.card} ${styles.chartPanel}`}>
            <div className={styles.chartToolbar}>
              <div className={projectStyles.pillRow} role="tablist" aria-label="Chart metric">
                {CHART_TAB_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={chartTab === id}
                    className={
                      chartTab === id
                        ? `${projectStyles.stageChip} ${projectStyles.stageChip_current}`
                        : projectStyles.stageChip
                    }
                    onClick={() => onChartTabChange(id)}
                  >
                    {content.reports.chartTabs[id]}
                  </button>
                ))}
              </div>
              <p className={styles.chartPeriodLabel} aria-live="polite">
                {content.reports.periods[period]}
              </p>
            </div>
            <ReportsLineChart series={dashboard.chart} formatValue={formatCentsAsUsd} />
          </div>
        );
      case 'costBreakdown':
        return (
          <ReportsCostBreakdownPanel
            rows={dashboard.costBreakdown}
            costsIncludeUndatedEntries={dashboard.costsIncludeUndatedEntries}
          />
        );
      case 'projectPerformance':
        return <ReportsProjectPerformanceSection rows={dashboard.projectRows} />;
      case 'recentActivity':
        return <ReportsRecentActivityPanel items={dashboard.recentActivity} />;
      default: {
        const _exhaustive: never = selectedTab;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      className={styles.reportsFolderTabs}
      data-reports-tab={selectedTab}
    >
      <div className={projectStyles.folderTabList} role="tablist" aria-label="Report sections">
        {tabs.map((tab) => {
          const isActive = tab.id === selectedTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`reports-folder-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls="reports-folder-tabpanel"
              tabIndex={isActive ? 0 : -1}
              className={isActive ? projectStyles.folderTabActive : projectStyles.folderTab}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id="reports-folder-tabpanel"
        role="tabpanel"
        aria-labelledby={`reports-folder-tab-${selectedTab}`}
        className={styles.reportsFolderTabPanel}
      >
        <div
          className={styles.reportsFolderTabPanelInner}
          data-reports-tab={selectedTab}
        >
          {renderTabPanel()}
        </div>
      </div>
    </div>
  );
}
