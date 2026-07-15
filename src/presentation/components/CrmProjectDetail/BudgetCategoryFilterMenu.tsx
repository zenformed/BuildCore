'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { CrmBudgetCategory } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CaretDownIcon, FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import {
  BUDGET_CATEGORY_FILTER_OPTIONS,
  EMPTY_BUDGET_LIST_FILTERS,
  isBudgetListFiltersActive,
  type BudgetListFilters,
} from '@/presentation/features/crmProjectDetail/budgetFilterModel';
import type { CrmDocumentsRequiredFilterValue } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import projectStyles from '../CrmProjects/CrmProjects.module.css';

const DOCUMENTS_REQUIRED_FILTER_VALUES: readonly CrmDocumentsRequiredFilterValue[] = [
  'yes',
  'no',
];

export type BudgetFilterMenuTriggerVariant = 'filter' | 'caret';

export type BudgetCategoryFilterMenuProps = {
  readonly filters: BudgetListFilters;
  readonly onChange: (filters: BudgetListFilters) => void;
  readonly triggerVariant?: BudgetFilterMenuTriggerVariant;
  readonly menuAlign?: 'start' | 'end';
};

export function BudgetCategoryFilterMenu({
  filters,
  onChange,
  triggerVariant = 'filter',
  menuAlign = 'end',
}: BudgetCategoryFilterMenuProps): ReactElement {
  const b = content.projectDetail.budget;
  const filterCopy = content.crm.filters;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = isBudgetListFiltersActive(filters);
  const isCaret = triggerVariant === 'caret';

  const toggleCategory = (category: CrmBudgetCategory): void => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((value) => value !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories: next });
  };

  const toggleDocumentsRequired = (value: CrmDocumentsRequiredFilterValue): void => {
    const next = filters.documentsRequired.includes(value)
      ? filters.documentsRequired.filter((entry) => entry !== value)
      : [...filters.documentsRequired, value];
    onChange({ ...filters, documentsRequired: next });
  };

  const documentsRequiredLabel = (value: CrmDocumentsRequiredFilterValue): string =>
    value === 'yes' ? filterCopy.documentsRequiredYes : filterCopy.documentsRequiredNo;

  const triggerBtnClass = [
    isCaret ? projectStyles.projectsFilterCaretBtn : projectStyles.projectsFilterBtn,
    active
      ? isCaret
        ? projectStyles.projectsFilterCaretBtn_active
        : projectStyles.projectsFilterBtn_active
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={anchorRef} className={projectStyles.projectsFilterWrap}>
      <button
        type="button"
        className={triggerBtnClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={b.filterAriaLabel}
        title={filterCopy.openMenu}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {isCaret ? (
          <CaretDownIcon className={projectStyles.projectsFilterCaretIcon} />
        ) : (
          <FilterIcon className={projectStyles.projectsFilterBtnIcon} />
        )}
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={menuAlign}
        sizeToContent
        portalClassName={projectStyles.projectsFilterMenuPortal}
      >
        <div className={projectStyles.projectsFilterMenu} role="group" aria-label={b.filterAriaLabel}>
          <fieldset className={projectStyles.projectsFilterFieldset}>
            <legend className={projectStyles.projectsFilterLegend}>{b.columns.category}</legend>
            <div className={projectStyles.projectsFilterOptions}>
              {BUDGET_CATEGORY_FILTER_OPTIONS.map((option) => (
                <label key={option.id} className={projectStyles.projectsFilterOption}>
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(option.id)}
                    onChange={() => toggleCategory(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className={projectStyles.projectsFilterFieldset}>
            <legend className={projectStyles.projectsFilterLegend}>
              {filterCopy.documentsRequiredLabel}
            </legend>
            <div className={projectStyles.projectsFilterOptions}>
              {DOCUMENTS_REQUIRED_FILTER_VALUES.map((value) => (
                <label key={value} className={projectStyles.projectsFilterOption}>
                  <input
                    type="checkbox"
                    checked={filters.documentsRequired.includes(value)}
                    onChange={() => toggleDocumentsRequired(value)}
                  />
                  <span>{documentsRequiredLabel(value)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className={projectStyles.projectsFilterClearBtn}
            disabled={!active}
            onClick={() => {
              onChange(EMPTY_BUDGET_LIST_FILTERS);
            }}
          >
            {filterCopy.clear}
          </button>
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
