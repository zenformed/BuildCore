'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import {
  BUDGET_TABLE_FILTERS,
  type BudgetTableFilter,
} from '@/presentation/features/crmProjectDetail/budgetFilterModel';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

export type BudgetCategoryFilterMenuProps = {
  readonly filter: BudgetTableFilter;
  readonly onChange: (filter: BudgetTableFilter) => void;
};

export function BudgetCategoryFilterMenu({
  filter,
  onChange,
}: BudgetCategoryFilterMenuProps): ReactElement {
  const b = content.projectDetail.budget;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = filter !== 'all';

  return (
    <div ref={anchorRef} className={styles.budgetFilterWrap}>
      <button
        type="button"
        className={
          active
            ? `${styles.budgetFilterBtn} ${styles.budgetFilterBtn_active}`
            : styles.budgetFilterBtn
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={b.filterAriaLabel}
        title={b.filterAriaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FilterIcon className={styles.budgetFilterBtnIcon} />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
      >
        {BUDGET_TABLE_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              filter === tab.id
                ? `${styles.inlineMenuAction} ${styles.budgetFilterMenuOption_active}`
                : styles.inlineMenuAction
            }
            aria-pressed={filter === tab.id}
            onClick={() => {
              onChange(tab.id);
              setOpen(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}
