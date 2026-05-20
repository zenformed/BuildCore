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
  createDraftOpen: boolean;
  onCreateDraftOpenChange: (open: boolean) => void;
  onStageFilterChange: (value: CrmStageFilter) => void;
  onPriorityFilterChange: (value: CrmPriorityFilter) => void;
  onProjectRowClick: (project: CrmProjectSummary) => void;
  onProjectCreated?: () => void | Promise<void>;
};

export function CrmProjectsPipeline({
  searchQuery,
  stageFilter,
  priorityFilter,
  createDraftOpen,
  onCreateDraftOpenChange,
  onStageFilterChange,
  onPriorityFilterChange,
  onProjectRowClick,
  onProjectCreated,
}: CrmProjectsPipelineProps): ReactElement {
  const { rows, totalCount, filteredCount, isLoading, refetch } = useCrmProjectsPipeline(
    searchQuery,
    stageFilter,
    priorityFilter
  );

  const handleProjectCreated = async (): Promise<void> => {
    refetch();
    onCreateDraftOpenChange(false);
    await onProjectCreated?.();
  };

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
      <CrmProjectsTable
        rows={rows}
        isLoading={isLoading}
        draftOpen={createDraftOpen}
        onDraftOpenChange={onCreateDraftOpenChange}
        onProjectCreated={handleProjectCreated}
        onRowClick={onProjectRowClick}
      />
    </div>
  );
}
