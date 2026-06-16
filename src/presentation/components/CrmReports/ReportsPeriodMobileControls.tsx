'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import { REPORT_PERIOD_IDS } from '@/presentation/features/crmReports/reportsFolderTabModel';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

const PERIOD_SELECT_ID = 'reports-period-select';

export type ReportsPeriodMobileControlsProps = {
  readonly period: ReportPeriodId;
  readonly onPeriodChange: (period: ReportPeriodId) => void;
};

export function ReportsPeriodMobileControls({
  period,
  onPeriodChange,
}: ReportsPeriodMobileControlsProps): ReactElement {
  const copy = content.reports.mobileControls;

  const handlePeriodChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onPeriodChange(event.target.value as ReportPeriodId);
  };

  return (
    <div
      className={`${projectStyles.folderTabMobileSelector} ${styles.reportsMobilePeriodSelector}`}
    >
      <label htmlFor={PERIOD_SELECT_ID} className={projectStyles.folderTabMobileSelectorLabel}>
        {copy.reportRangeLabel}
      </label>
      <select
        id={PERIOD_SELECT_ID}
        className={`${formStyles.select} ${projectStyles.folderTabMobileSelect}`}
        value={period}
        onChange={handlePeriodChange}
        aria-label={copy.reportRangeAriaLabel}
      >
        {REPORT_PERIOD_IDS.map((id) => (
          <option key={id} value={id}>
            {content.reports.periods[id]}
          </option>
        ))}
      </select>
    </div>
  );
}
