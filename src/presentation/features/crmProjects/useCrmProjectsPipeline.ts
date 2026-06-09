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
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  filterCrmProjectSummaries,
  type CrmProjectsListFilters,
} from './crmProjectsPipelineViewModel';

export function useCrmProjectsPipeline(
  searchQuery: string,
  filters: CrmProjectsListFilters
): {
  rows: CrmProjectSummary[];
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
  removeProject: (projectId: string) => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const includeSubprojects = searchQuery.trim().length > 0;
  const [allSummaries, setAllSummaries] = useState<readonly CrmProjectSummary[] | null>(() =>
    isApiSource
      ? null
      : listCrmProjectSummariesSync(crmRepositories, { rootsOnly: !includeSubprojects })
  );

  const loadSummaries = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setAllSummaries(
        listCrmProjectSummariesSync(crmRepositories, { rootsOnly: !includeSubprojects })
      );
      return;
    }
    const data = await listCrmProjectSummaries(crmRepositories, {
      rootsOnly: !includeSubprojects,
    });
    setAllSummaries(data);
  }, [includeSubprojects, isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;
    void loadSummaries();
  }, [isApiSource, loadSummaries]);

  const summaries = allSummaries ?? [];
  const isLoading = allSummaries === null;

  const rows = useMemo(
    () => filterCrmProjectSummaries(summaries, searchQuery, filters),
    [summaries, searchQuery, filters]
  );

  const removeProject = useCallback((projectId: string) => {
    setAllSummaries((current) =>
      current == null ? current : current.filter((project) => project.id !== projectId)
    );
  }, []);

  return {
    rows,
    totalCount: summaries.length,
    filteredCount: rows.length,
    isLoading,
    refetch: loadSummaries,
    removeProject,
  };
}

export { EMPTY_CRM_PROJECTS_LIST_FILTERS };
