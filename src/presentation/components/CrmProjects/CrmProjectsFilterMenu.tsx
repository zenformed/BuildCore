'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { CrmPriority, PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  isCrmProjectsListFiltersActive,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import styles from './CrmProjects.module.css';

const CRM_PRIORITIES: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];

const PRIORITY_LABELS: Record<CrmPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export type CrmProjectsFilterMenuProps = {
  readonly filters: CrmProjectsListFilters;
  readonly onChange: (filters: CrmProjectsListFilters) => void;
};

export function CrmProjectsFilterMenu({
  filters,
  onChange,
}: CrmProjectsFilterMenuProps): ReactElement {
  const copy = content.crm.filters;
  const { catalog } = useBuildCorePipelineStages();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = isCrmProjectsListFiltersActive(filters);

  const toggleStage = (slug: PipelineStageSlug): void => {
    const next = filters.stageSlugs.includes(slug)
      ? filters.stageSlugs.filter((value) => value !== slug)
      : [...filters.stageSlugs, slug];
    onChange({ ...filters, stageSlugs: next });
  };

  const togglePriority = (priority: CrmPriority): void => {
    const next = filters.priorities.includes(priority)
      ? filters.priorities.filter((value) => value !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: next });
  };

  return (
    <div ref={anchorRef} className={styles.projectsFilterWrap}>
      <button
        type="button"
        className={
          active
            ? `${styles.projectsFilterBtn} ${styles.projectsFilterBtn_active}`
            : styles.projectsFilterBtn
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.menuAriaLabel}
        title={copy.openMenu}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FilterIcon className={styles.projectsFilterBtnIcon} />
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={styles.projectsFilterMenuPortal}
      >
        <div className={styles.projectsFilterMenu} role="group" aria-label={copy.menuAriaLabel}>
          <fieldset className={styles.projectsFilterFieldset}>
            <legend className={styles.projectsFilterLegend}>{copy.stageLabel}</legend>
            <div className={styles.projectsFilterOptions}>
              {catalog.map((stage) => (
                <label key={stage.slug} className={styles.projectsFilterOption}>
                  <input
                    type="checkbox"
                    checked={filters.stageSlugs.includes(stage.slug)}
                    onChange={() => toggleStage(stage.slug)}
                  />
                  <span>{stage.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.projectsFilterFieldset}>
            <legend className={styles.projectsFilterLegend}>{copy.priorityLabel}</legend>
            <div className={styles.projectsFilterOptions}>
              {CRM_PRIORITIES.map((priority) => (
                <label key={priority} className={styles.projectsFilterOption}>
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority)}
                    onChange={() => togglePriority(priority)}
                  />
                  <span>{PRIORITY_LABELS[priority]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className={styles.projectsFilterClearBtn}
            disabled={!active}
            onClick={() => onChange(EMPTY_CRM_PROJECTS_LIST_FILTERS)}
          >
            {copy.clear}
          </button>
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
