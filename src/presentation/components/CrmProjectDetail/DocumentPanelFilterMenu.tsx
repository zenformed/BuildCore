'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CaretDownIcon, FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import {
  DOCUMENT_PANEL_FILTERS,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import projectStyles from '../CrmProjects/CrmProjects.module.css';

export type DocumentFilterMenuTriggerVariant = 'filter' | 'caret';

export type DocumentPanelFilterMenuProps = {
  readonly filter: DocumentPanelFilter;
  readonly onChange: (filter: DocumentPanelFilter) => void;
  readonly triggerVariant?: DocumentFilterMenuTriggerVariant;
  readonly menuAlign?: 'start' | 'end';
};

export function DocumentPanelFilterMenu({
  filter,
  onChange,
  triggerVariant = 'filter',
  menuAlign = 'end',
}: DocumentPanelFilterMenuProps): ReactElement {
  const docs = content.projectDetail.documents;
  const filterCopy = content.crm.filters;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = filter !== 'all';
  const isCaret = triggerVariant === 'caret';
  const triggerClass = [
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
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={docs.filterAriaLabel}
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
        <div className={projectStyles.projectsFilterMenu} role="group" aria-label={docs.filterAriaLabel}>
          <fieldset className={projectStyles.projectsFilterFieldset}>
            <legend className={projectStyles.projectsFilterLegend}>{docs.columns.status}</legend>
            <div className={projectStyles.projectsFilterOptions}>
              {DOCUMENT_PANEL_FILTERS.map((tab) => (
                <label key={tab.id} className={projectStyles.projectsFilterOption}>
                  <input
                    type="radio"
                    name="document-panel-filter"
                    checked={filter === tab.id}
                    onChange={() => {
                      onChange(tab.id);
                      setOpen(false);
                    }}
                  />
                  <span>{tab.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className={projectStyles.projectsFilterClearBtn}
            disabled={!active}
            onClick={() => {
              onChange('all');
              setOpen(false);
            }}
          >
            {filterCopy.clear}
          </button>
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
