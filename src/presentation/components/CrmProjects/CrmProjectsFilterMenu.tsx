'use client';

import type { ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';
import {
  CRM_PRIORITY_FILTER_VALUES,
  type CrmPriorityFilterValue,
} from '@/domain/crm/projectPriorityToggle';
import type { PipelineStageScope } from '@/domain/buildcore/orgPipelineStages';
import {
  WORKFLOW_TASK_STATUSES,
  WORKFLOW_TASK_STATUS_LABELS,
} from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import {
  buildMixedPipelineStageFilterGroups,
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  isCrmProjectsListFiltersActive,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import styles from './CrmProjects.module.css';

const PRIORITY_LABELS: Record<CrmPriorityFilterValue, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
};

export type CrmProjectsFilterMenuProps = {
  readonly filters: CrmProjectsListFilters;
  readonly onChange: (filters: CrmProjectsListFilters) => void;
  /** Mixed dashboard lists show both catalogs; single-entity views use one scope. */
  readonly stageScopeMode?: 'mixed' | PipelineStageScope;
};

export function CrmProjectsFilterMenu({
  filters,
  onChange,
  stageScopeMode = 'mixed',
}: CrmProjectsFilterMenuProps): ReactElement {
  const copy = content.crm.filters;
  const stageColumnCopy = content.workflowSettings.stageColumns;
  const { getCatalog } = useBuildCorePipelineStages();
  const stageFilterGroups = useMemo(() => {
    if (stageScopeMode === 'mixed') {
      return buildMixedPipelineStageFilterGroups({
        projectStages: getCatalog('project'),
        subprojectStages: getCatalog('subproject'),
        projectTitle: stageColumnCopy.projectStages,
        subprojectTitle: stageColumnCopy.subprojectStages,
      });
    }

    return [
      {
        scope: stageScopeMode,
        title: copy.stageLabel,
        stages: getCatalog(stageScopeMode),
      },
    ];
  }, [getCatalog, stageColumnCopy.projectStages, stageColumnCopy.subprojectStages, stageScopeMode, copy.stageLabel]);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = isCrmProjectsListFiltersActive(filters);

  const toggleStage = (slug: PipelineStageSlug): void => {
    const next = filters.stageSlugs.includes(slug)
      ? filters.stageSlugs.filter((value) => value !== slug)
      : [...filters.stageSlugs, slug];
    onChange({ ...filters, stageSlugs: next });
  };

  const togglePriority = (priority: CrmPriorityFilterValue): void => {
    const next = filters.priorities.includes(priority)
      ? filters.priorities.filter((value) => value !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: next });
  };

  const toggleWorkflowTaskStatus = (status: WorkflowTaskStatus): void => {
    const next = filters.workflowTaskStatuses.includes(status)
      ? filters.workflowTaskStatuses.filter((value) => value !== status)
      : [...filters.workflowTaskStatuses, status];
    onChange({ ...filters, workflowTaskStatuses: next });
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
          {stageFilterGroups.map((group) => (
            <fieldset key={group.scope} className={styles.projectsFilterFieldset}>
              <legend className={styles.projectsFilterLegend}>{group.title}</legend>
              <div className={styles.projectsFilterOptions}>
                {group.stages.map((stage) => (
                  <label key={`${group.scope}-${stage.slug}`} className={styles.projectsFilterOption}>
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
          ))}
          <fieldset className={styles.projectsFilterFieldset}>
            <legend className={styles.projectsFilterLegend}>{copy.priorityLabel}</legend>
            <div className={styles.projectsFilterOptions}>
              {CRM_PRIORITY_FILTER_VALUES.map((priority) => (
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
          <fieldset className={styles.projectsFilterFieldset}>
            <legend className={styles.projectsFilterLegend}>{copy.statusLabel}</legend>
            <div className={styles.projectsFilterOptions}>
              {WORKFLOW_TASK_STATUSES.map((status) => (
                <label key={status} className={styles.projectsFilterOption}>
                  <input
                    type="checkbox"
                    checked={filters.workflowTaskStatuses.includes(status)}
                    onChange={() => toggleWorkflowTaskStatus(status)}
                  />
                  <span>{WORKFLOW_TASK_STATUS_LABELS[status]}</span>
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
