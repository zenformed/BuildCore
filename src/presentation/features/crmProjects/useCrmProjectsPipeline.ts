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
  filterDashboardProjectSummaries,
  partitionCrmProjectSummaries,
  type CrmProjectsListFilters,
} from './crmProjectsPipelineViewModel';

export function useCrmProjectsPipeline(
  searchQuery: string,
  filters: CrmProjectsListFilters
): {
  rootRows: CrmProjectSummary[];
  allChildrenByParentId: Map<string, CrmProjectSummary[]>;
  visibleChildrenByParentId: Map<string, CrmProjectSummary[]>;
  parentsWithMatchingChildren: Set<string>;
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
  removeProject: (projectId: string) => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const [allSummaries, setAllSummaries] = useState<readonly CrmProjectSummary[] | null>(() =>
    isApiSource ? null : listCrmProjectSummariesSync(crmRepositories, { rootsOnly: false })
  );

  const loadSummaries = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setAllSummaries(listCrmProjectSummariesSync(crmRepositories, { rootsOnly: false }));
      return;
    }
    const data = await listCrmProjectSummaries(crmRepositories, { rootsOnly: false });
    setAllSummaries(data);
  }, [isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;
    void loadSummaries();
  }, [isApiSource, loadSummaries]);

  const summaries = allSummaries ?? [];
  const isLoading = allSummaries === null;

  const dashboardView = useMemo(
    () => filterDashboardProjectSummaries(summaries, searchQuery, filters),
    [summaries, searchQuery, filters]
  );

  const { roots: allRoots } = useMemo(
    () => partitionCrmProjectSummaries(summaries),
    [summaries]
  );

  const removeProject = useCallback((projectId: string) => {
    setAllSummaries((current) =>
      current == null ? current : current.filter((project) => project.id !== projectId)
    );
  }, []);

  return {
    rootRows: dashboardView.rootRows,
    allChildrenByParentId: dashboardView.allChildrenByParentId,
    visibleChildrenByParentId: dashboardView.visibleChildrenByParentId,
    parentsWithMatchingChildren: dashboardView.parentsWithMatchingChildren,
    totalCount: allRoots.length,
    filteredCount: dashboardView.rootRows.length,
    isLoading,
    refetch: loadSummaries,
    removeProject,
  };
}

export { EMPTY_CRM_PROJECTS_LIST_FILTERS };
