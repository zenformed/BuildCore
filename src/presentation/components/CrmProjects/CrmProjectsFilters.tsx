'use client';

import type { ReactElement } from 'react';
import { DEFAULT_PIPELINE_STAGES } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { CrmPriorityFilter, CrmStageFilter } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import styles from './CrmProjects.module.css';

const PRIORITY_OPTIONS: { value: CrmPriorityFilter; label: string }[] = [
  { value: 'all', label: content.crm.filters.priorityAll },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export type CrmProjectsFiltersProps = {
  stageFilter: CrmStageFilter;
  priorityFilter: CrmPriorityFilter;
  filteredCount: number;
  totalCount: number;
  onStageFilterChange: (value: CrmStageFilter) => void;
  onPriorityFilterChange: (value: CrmPriorityFilter) => void;
};

export function CrmProjectsFilters({
  stageFilter,
  priorityFilter,
  filteredCount,
  totalCount,
  onStageFilterChange,
  onPriorityFilterChange,
}: CrmProjectsFiltersProps): ReactElement {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label={content.crm.filters.toolbarAriaLabel}>
      <p className={styles.resultCount}>{content.crm.resultCount(filteredCount, totalCount)}</p>
      <FilterSelect
        id="crm-stage-filter"
        label={content.crm.filters.stageLabel}
        value={stageFilter}
        onChange={(v) => onStageFilterChange(v as CrmStageFilter)}
        options={[
          { value: 'all', label: content.crm.filters.stageAll },
          ...DEFAULT_PIPELINE_STAGES.map((s) => ({ value: s.slug, label: s.label })),
        ]}
      />
      <FilterSelect
        id="crm-priority-filter"
        label={content.crm.filters.priorityLabel}
        value={priorityFilter}
        onChange={(v) => onPriorityFilterChange(v as CrmPriorityFilter)}
        options={PRIORITY_OPTIONS}
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}): ReactElement {
  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.filterSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
