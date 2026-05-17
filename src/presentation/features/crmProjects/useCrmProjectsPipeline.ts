'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import {
  listCrmProjectSummaries,
  listCrmProjectSummariesSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
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
  isLoading: boolean;
} {
  const isApiSource = getCrmDataSource() === 'api';

  const [allSummaries, setAllSummaries] = useState<readonly CrmProjectSummary[] | null>(() =>
    isApiSource ? null : listCrmProjectSummariesSync(crmRepositories)
  );

  useEffect(() => {
    if (!isApiSource) return;

    let cancelled = false;
    void listCrmProjectSummaries(crmRepositories).then((data) => {
      if (!cancelled) setAllSummaries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isApiSource]);

  const summaries = allSummaries ?? [];
  const isLoading = allSummaries === null;

  const rows = useMemo(
    () => filterCrmProjectSummaries(summaries, searchQuery, stageFilter, priorityFilter),
    [summaries, searchQuery, stageFilter, priorityFilter]
  );

  return {
    rows,
    totalCount: summaries.length,
    filteredCount: rows.length,
    isLoading,
  };
}
