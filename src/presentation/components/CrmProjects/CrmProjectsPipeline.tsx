'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { useCrmProjectsPipeline } from '@/presentation/features/crmProjects/useCrmProjectsPipeline';
import type { CrmPriorityFilter, CrmStageFilter } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { CrmProjectsFilters } from './CrmProjectsFilters';
import { CrmProjectsTable } from './CrmProjectsTable';
import styles from './CrmProjects.module.css';

export type CrmProjectsPipelineProps = {
  searchQuery: string;
  stageFilter: CrmStageFilter;
  priorityFilter: CrmPriorityFilter;
  onStageFilterChange: (value: CrmStageFilter) => void;
  onPriorityFilterChange: (value: CrmPriorityFilter) => void;
  onProjectRowClick: (project: CrmProjectSummary) => void;
};

export function CrmProjectsPipeline({
  searchQuery,
  stageFilter,
  priorityFilter,
  onStageFilterChange,
  onPriorityFilterChange,
  onProjectRowClick,
}: CrmProjectsPipelineProps): ReactElement {
  const { rows, totalCount, filteredCount } = useCrmProjectsPipeline(
    searchQuery,
    stageFilter,
    priorityFilter
  );

  return (
    <div className={styles.pipeline}>
      <CrmProjectsFilters
        stageFilter={stageFilter}
        priorityFilter={priorityFilter}
        filteredCount={filteredCount}
        totalCount={totalCount}
        onStageFilterChange={onStageFilterChange}
        onPriorityFilterChange={onPriorityFilterChange}
      />
      <CrmProjectsTable rows={rows} onRowClick={onProjectRowClick} />
    </div>
  );
}
