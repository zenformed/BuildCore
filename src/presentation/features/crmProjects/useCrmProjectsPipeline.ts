'use client';

import { useMemo } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { MOCK_CRM_PROJECT_SUMMARIES } from '@/platform/mock/crm';
import {
  filterCrmProjectSummaries,
  type CrmPriorityFilter,
  type CrmStageFilter,
} from './crmProjectsPipelineViewModel';

export function useCrmProjectsPipeline(
  searchQuery: string,
  stageFilter: CrmStageFilter,
  priorityFilter: CrmPriorityFilter
): {
  rows: CrmProjectSummary[];
  totalCount: number;
  filteredCount: number;
} {
  const rows = useMemo(
    () => filterCrmProjectSummaries(MOCK_CRM_PROJECT_SUMMARIES, searchQuery, stageFilter, priorityFilter),
    [searchQuery, stageFilter, priorityFilter]
  );

  return {
    rows,
    totalCount: MOCK_CRM_PROJECT_SUMMARIES.length,
    filteredCount: rows.length,
  };
}
