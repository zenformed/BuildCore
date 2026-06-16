'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type {
  ReportsFolderTabDef,
  ReportsFolderTabId,
} from '@/presentation/features/crmReports/reportsFolderTabModel';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

const SECTION_SELECT_ID = 'reports-section-select';

export const REPORTS_SECTION_SELECT_LABEL_ID = `${SECTION_SELECT_ID}-label`;

export type ReportsSectionMobileSelectorProps = {
  readonly tabs: readonly ReportsFolderTabDef[];
  readonly selectedTab: ReportsFolderTabId;
  readonly onSelectTab: (tabId: ReportsFolderTabId) => void;
};

export function ReportsSectionMobileSelector({
  tabs,
  selectedTab,
  onSelectTab,
}: ReportsSectionMobileSelectorProps): ReactElement {
  const copy = content.reports.mobileControls;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSelectTab(event.target.value as ReportsFolderTabId);
  };

  return (
    <div className={`${projectStyles.folderTabMobileSelector} ${styles.reportsMobileSectionSelector}`}>
      <label
        htmlFor={SECTION_SELECT_ID}
        id={REPORTS_SECTION_SELECT_LABEL_ID}
        className={projectStyles.folderTabMobileSelectorLabel}
      >
        {copy.sectionLabel}
      </label>
      <select
        id={SECTION_SELECT_ID}
        className={`${formStyles.select} ${projectStyles.folderTabMobileSelect}`}
        value={selectedTab}
        onChange={handleChange}
        aria-label={copy.sectionAriaLabel}
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
    </div>
  );
}
