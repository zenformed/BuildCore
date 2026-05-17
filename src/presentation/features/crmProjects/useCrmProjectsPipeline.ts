'use client';

import { useMemo } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { listCrmProjectSummaries } from '@/application/use-cases/crm';
import { getCrmRepositories } from '@/infrastructure/crm/crmRepositories';
import {
  filterCrmProjectSummaries,
  type CrmPriorityFilter,
  type CrmStageFilter,
} from './crmProjectsPipelineViewModel';

const crmRepositories = getCrmRepositories();

export function useCrmProjectsPipeline(
  searchQuery: string,
  stageFilter: CrmStageFilter,
  priorityFilter: CrmPriorityFilter
): {
  rows: CrmProjectSummary[];
  totalCount: number;
  filteredCount: number;
} {
  const allSummaries = useMemo(() => listCrmProjectSummaries(crmRepositories), []);

  const rows = useMemo(
    () => filterCrmProjectSummaries(allSummaries, searchQuery, stageFilter, priorityFilter),
    [allSummaries, searchQuery, stageFilter, priorityFilter]
  );

  return {
    rows,
    totalCount: allSummaries.length,
    filteredCount: rows.length,
  };
}
