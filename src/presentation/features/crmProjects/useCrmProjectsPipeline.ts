'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  refetch: () => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const [reloadKey, setReloadKey] = useState(0);
  const [allSummaries, setAllSummaries] = useState<readonly CrmProjectSummary[] | null>(() =>
    isApiSource ? null : listCrmProjectSummariesSync(crmRepositories)
  );

  const refetch = useCallback(() => {
    if (isApiSource) {
      setReloadKey((key) => key + 1);
      return;
    }
    setAllSummaries(listCrmProjectSummariesSync(crmRepositories));
  }, [isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;

    let cancelled = false;
    void listCrmProjectSummaries(crmRepositories).then((data) => {
      if (!cancelled) setAllSummaries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isApiSource, reloadKey]);

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
    refetch,
  };
}
