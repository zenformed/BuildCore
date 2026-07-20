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
import { CaretDownIcon, FilterIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { WorkflowInlineMenu } from '@/presentation/components/CrmProjectDetail/WorkflowInlineMenu';
import {
  buildMixedPipelineStageFilterGroups,
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  type CrmDocumentsRequiredFilterValue,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import type { CrmAssigneeFilterOption } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { RadiusFilterSection } from '@/presentation/components/filters/RadiusFilterSection';
import {
  EMPTY_RADIUS_FILTER,
  isRadiusFilterActive,
  type RadiusFilterState,
} from '@/presentation/features/filters/radiusFilterModel';
import styles from './CrmProjects.module.css';

const PRIORITY_LABELS: Record<CrmPriorityFilterValue, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
};

const DOCUMENTS_REQUIRED_FILTER_VALUES: readonly CrmDocumentsRequiredFilterValue[] = [
  'yes',
  'no',
];

export type CrmProjectsFilterMenuSection =
  | 'stage'
  | 'priority'
  | 'status'
  | 'assigned'
  | 'documentsRequired';

export type CrmProjectsFilterMenuTriggerVariant = 'filter' | 'caret';

export type CrmProjectsFilterMenuProps = {
  readonly filters: CrmProjectsListFilters;
  readonly onChange: (filters: CrmProjectsListFilters) => void;
  /** Mixed dashboard lists show both catalogs; single-entity views use one scope. */
  readonly stageScopeMode?: 'mixed' | PipelineStageScope;
  readonly radiusFilter?: RadiusFilterState;
  readonly onRadiusFilterChange?: (filter: RadiusFilterState) => void;
  /** Default filter funnels icon; caret is Gmail-style compact trigger. */
  readonly triggerVariant?: CrmProjectsFilterMenuTriggerVariant;
  readonly menuAlign?: 'start' | 'end';
  readonly className?: string;
  readonly triggerClassName?: string;
  /** Which filter groups to show. Defaults to stage + priority + status. */
  readonly sections?: readonly CrmProjectsFilterMenuSection[];
  /** Required when `sections` includes `assigned`. */
  readonly assigneeFilterOptions?: readonly CrmAssigneeFilterOption[];
  /** Optional single-select assignee scope (e.g. My Tasks Mine / Others / Everyone). */
  readonly assigneeScope?: string | null;
  readonly onAssigneeScopeChange?: (scope: string) => void;
  readonly assigneeScopeOptions?: readonly { readonly value: string; readonly label: string }[];
  readonly assigneeScopeLabel?: string;
  readonly assigneeScopeDefault?: string;
};

const DEFAULT_FILTER_SECTIONS: readonly CrmProjectsFilterMenuSection[] = [
  'stage',
  'priority',
  'status',
];

export function CrmProjectsFilterMenu({
  filters,
  onChange,
  stageScopeMode = 'mixed',
  radiusFilter,
  onRadiusFilterChange,
  triggerVariant = 'filter',
  menuAlign = 'end',
  className,
  triggerClassName,
  sections = DEFAULT_FILTER_SECTIONS,
  assigneeFilterOptions = [],
  assigneeScope = null,
  onAssigneeScopeChange,
  assigneeScopeOptions = [],
  assigneeScopeLabel,
  assigneeScopeDefault = 'mine',
}: CrmProjectsFilterMenuProps): ReactElement {
  const copy = content.crm.filters;
  const stageColumnCopy = content.workflowSettings.stageColumns;
  const { getCatalog } = useBuildCorePipelineStages();
  const showStage = sections.includes('stage');
  const showPriority = sections.includes('priority');
  const showStatus = sections.includes('status');
  const showAssigned = sections.includes('assigned');
  const showDocumentsRequired = sections.includes('documentsRequired');
  const showAssigneeScope =
    assigneeScopeOptions.length > 0 && onAssigneeScopeChange != null && assigneeScope != null;
  const stageFilterGroups = useMemo(() => {
    if (!showStage) return [];
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
        title:
          stageScopeMode === 'subproject'
            ? stageColumnCopy.subprojectStages
            : stageScopeMode === 'project'
              ? stageColumnCopy.projectStages
              : copy.stageLabel,
        stages: getCatalog(stageScopeMode),
      },
    ];
  }, [
    copy.stageLabel,
    getCatalog,
    showStage,
    stageColumnCopy.projectStages,
    stageColumnCopy.subprojectStages,
    stageScopeMode,
  ]);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const showRadiusFilter = radiusFilter != null && onRadiusFilterChange != null;
  const active =
    (showStage && filters.stageSlugs.length > 0) ||
    (showPriority && filters.priorities.length > 0) ||
    (showStatus && filters.workflowTaskStatuses.length > 0) ||
    (showAssigned && filters.assignedMemberIds.length > 0) ||
    (showDocumentsRequired && filters.documentsRequired.length > 0) ||
    (showRadiusFilter && isRadiusFilterActive(radiusFilter)) ||
    (showAssigneeScope && assigneeScope !== assigneeScopeDefault);
  const isCaret = triggerVariant === 'caret';

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

  const toggleAssignedMember = (memberId: string): void => {
    const next = filters.assignedMemberIds.includes(memberId)
      ? filters.assignedMemberIds.filter((value) => value !== memberId)
      : [...filters.assignedMemberIds, memberId];
    onChange({ ...filters, assignedMemberIds: next });
  };

  const toggleDocumentsRequired = (value: CrmDocumentsRequiredFilterValue): void => {
    const next = filters.documentsRequired.includes(value)
      ? filters.documentsRequired.filter((entry) => entry !== value)
      : [...filters.documentsRequired, value];
    onChange({ ...filters, documentsRequired: next });
  };

  const documentsRequiredLabel = (value: CrmDocumentsRequiredFilterValue): string =>
    value === 'yes' ? copy.documentsRequiredYes : copy.documentsRequiredNo;

  const triggerBtnClass = [
    isCaret ? styles.projectsFilterCaretBtn : styles.projectsFilterBtn,
    active
      ? isCaret
        ? styles.projectsFilterCaretBtn_active
        : styles.projectsFilterBtn_active
      : '',
    triggerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={anchorRef}
      className={[styles.projectsFilterWrap, className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={triggerBtnClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={copy.menuAriaLabel}
        title={copy.openMenu}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {isCaret ? (
          <CaretDownIcon className={styles.projectsFilterCaretIcon} />
        ) : (
          <FilterIcon className={styles.projectsFilterBtnIcon} />
        )}
      </button>
      <WorkflowInlineMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={menuAlign}
        sizeToContent
        portalClassName={styles.projectsFilterMenuPortal}
      >
        <div className={styles.projectsFilterMenu} role="group" aria-label={copy.menuAriaLabel}>
          {showAssigneeScope ? (
            <fieldset className={styles.projectsFilterFieldset}>
              <legend className={styles.projectsFilterLegend}>
                {assigneeScopeLabel ?? copy.assignedLabel}
              </legend>
              <div className={styles.projectsFilterOptions}>
                {assigneeScopeOptions.map((option) => (
                  <label key={option.value} className={styles.projectsFilterOption}>
                    <input
                      type="radio"
                      name="crm-projects-assignee-scope"
                      checked={assigneeScope === option.value}
                      onChange={() => onAssigneeScopeChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
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
          {showPriority ? (
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
          ) : null}
          {showStatus ? (
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
          ) : null}
          {showAssigned && assigneeFilterOptions.length > 0 ? (
            <fieldset className={styles.projectsFilterFieldset}>
              <legend className={styles.projectsFilterLegend}>{copy.assignedLabel}</legend>
              <div className={styles.projectsFilterOptions}>
                {assigneeFilterOptions.map((option) => (
                  <label key={option.id} className={styles.projectsFilterOption}>
                    <input
                      type="checkbox"
                      checked={filters.assignedMemberIds.includes(option.id)}
                      onChange={() => toggleAssignedMember(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {showDocumentsRequired ? (
            <fieldset className={styles.projectsFilterFieldset}>
              <legend className={styles.projectsFilterLegend}>{copy.documentsRequiredLabel}</legend>
              <div className={styles.projectsFilterOptions}>
                {DOCUMENTS_REQUIRED_FILTER_VALUES.map((value) => (
                  <label key={value} className={styles.projectsFilterOption}>
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
          ) : null}
          {showRadiusFilter ? (
            <RadiusFilterSection filter={radiusFilter} onChange={onRadiusFilterChange} />
          ) : null}
          <button
            type="button"
            className={styles.projectsFilterClearBtn}
            disabled={!active}
            onClick={() => {
              onChange(EMPTY_CRM_PROJECTS_LIST_FILTERS);
              onRadiusFilterChange?.(EMPTY_RADIUS_FILTER);
              if (showAssigneeScope) {
                onAssigneeScopeChange(assigneeScopeDefault);
              }
            }}
          >
            {copy.clear}
          </button>
        </div>
      </WorkflowInlineMenu>
    </div>
  );
}
