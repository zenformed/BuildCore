'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import {
  listCrmProjectSummaries,
  listCrmProjectSummariesSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  filterDashboardProjectSummaries,
  partitionCrmProjectSummaries,
  type CrmProjectsListFilters,
} from './crmProjectsPipelineViewModel';

const EMPTY_PROJECT_SUMMARIES: readonly CrmProjectSummary[] = [];

export function useCrmProjectsPipeline(
  searchQuery: string,
  filters: CrmProjectsListFilters
): {
  rootRows: CrmProjectSummary[];
  allChildrenByParentId: Map<string, CrmProjectSummary[]>;
  visibleChildrenByParentId: Map<string, CrmProjectSummary[]>;
  parentsWithMatchingChildren: Set<string>;
  paymentTasksIndex: CrmProjectPaymentTasksIndex;
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  isPaymentFinancialsLoading: boolean;
  refetch: () => Promise<void>;
  removeProject: (projectId: string) => void;
  patchProjectSummary: (summary: CrmProjectSummary) => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const { paymentTasksIndex, isLoading: isPaymentFinancialsLoading, refetch: refetchPaymentIndex } =
    useCrmPaymentTasksIndexContext();
  const [allSummaries, setAllSummaries] = useState<readonly CrmProjectSummary[] | null>(() =>
    isApiSource ? null : listCrmProjectSummariesSync(crmRepositories, { rootsOnly: false })
  );

  const loadSummaries = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setAllSummaries(listCrmProjectSummariesSync(crmRepositories, { rootsOnly: false }));
      return;
    }
    const summaries = await listCrmProjectSummaries(crmRepositories, { rootsOnly: false });
    setAllSummaries(summaries);
  }, [isApiSource]);

  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([loadSummaries(), refetchPaymentIndex()]);
  }, [loadSummaries, refetchPaymentIndex]);

  useEffect(() => {
    if (!isApiSource) return;
    void loadSummaries();
  }, [isApiSource, loadSummaries]);

  const summaries = allSummaries ?? EMPTY_PROJECT_SUMMARIES;
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

  const patchProjectSummary = useCallback((summary: CrmProjectSummary) => {
    setAllSummaries((current) =>
      current == null
        ? current
        : current.map((project) => (project.id === summary.id ? summary : project))
    );
  }, []);

  return {
    rootRows: dashboardView.rootRows,
    allChildrenByParentId: dashboardView.allChildrenByParentId,
    visibleChildrenByParentId: dashboardView.visibleChildrenByParentId,
    parentsWithMatchingChildren: dashboardView.parentsWithMatchingChildren,
    paymentTasksIndex,
    totalCount: allRoots.length,
    filteredCount: dashboardView.rootRows.length,
    isLoading,
    isPaymentFinancialsLoading,
    refetch,
    removeProject,
    patchProjectSummary,
  };
}

export { EMPTY_CRM_PROJECTS_LIST_FILTERS };
