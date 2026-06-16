'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import type { ReportsProjectFilterId } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

const PROJECT_FILTER_IDS: readonly ReportsProjectFilterId[] = [
  'all',
  'active',
  'completed',
  'waiting_approval',
  'overdue_payments',
];

export type ReportsProjectPerformanceFilterMenuProps = {
  readonly filter: ReportsProjectFilterId;
  readonly filterCounts: Record<ReportsProjectFilterId, number>;
  readonly onChange: (filter: ReportsProjectFilterId) => void;
};

export function ReportsProjectPerformanceFilterMenu({
  filter,
  filterCounts,
  onChange,
}: ReportsProjectPerformanceFilterMenuProps): ReactElement {
  const copy = content.reports.projectPerformanceMobile;
  const filterLabels = content.reports.projectFilters;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = filter !== 'all';

  return (
    <div
      ref={anchorRef}
      className={`${projectStyles.budgetFilterWrap} ${styles.projectPerformanceFilterAnchor}`}
    >
      <button
        type="button"
        className={
          active
            ? `${projectStyles.budgetFilterBtn} ${projectStyles.budgetFilterBtn_active} ${styles.projectPerformanceFilterBtn}`
            : `${projectStyles.budgetFilterBtn} ${styles.projectPerformanceFilterBtn}`
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.filterAriaLabel}
        title={copy.filterAriaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FilterIcon className={projectStyles.budgetFilterBtnIcon} />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
      >
        {PROJECT_FILTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={
              filter === id
                ? `${projectStyles.inlineMenuAction} ${styles.projectPerformanceFilterMenuOption_active}`
                : projectStyles.inlineMenuAction
            }
            aria-pressed={filter === id}
            onClick={() => {
              onChange(id);
              setOpen(false);
            }}
          >
            <span className={styles.projectPerformanceFilterMenuOptionLabel}>
              {filterLabels[id]}
            </span>
            <span className={styles.projectPerformanceFilterMenuOptionCount}>{filterCounts[id]}</span>
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}
