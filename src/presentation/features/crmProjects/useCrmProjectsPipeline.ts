'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import {
  listCrmProjectSummaries,
  listCrmProjectSummariesSync,
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
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
  paymentTasksIndex: CrmProjectPaymentTasksIndex;
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
  const [paymentTasksIndex, setPaymentTasksIndex] = useState<CrmProjectPaymentTasksIndex | null>(
    () => (isApiSource ? null : loadCrmProjectPaymentTasksIndexSync(crmRepositories))
  );

  const loadPipelineData = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setAllSummaries(listCrmProjectSummariesSync(crmRepositories, { rootsOnly: false }));
      setPaymentTasksIndex(loadCrmProjectPaymentTasksIndexSync(crmRepositories));
      return;
    }
    const [summaries, paymentIndex] = await Promise.all([
      listCrmProjectSummaries(crmRepositories, { rootsOnly: false }),
      loadCrmProjectPaymentTasksIndex(crmRepositories),
    ]);
    setAllSummaries(summaries);
    setPaymentTasksIndex(paymentIndex);
  }, [isApiSource]);

  useEffect(() => {
    if (!isApiSource) return;
    void loadPipelineData();
  }, [isApiSource, loadPipelineData]);

  const summaries = allSummaries ?? [];
  const isLoading = allSummaries === null || paymentTasksIndex === null;
  const resolvedPaymentTasksIndex = paymentTasksIndex ?? new Map<string, never>();

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
    setPaymentTasksIndex((current) => {
      if (current == null) return current;
      const next = new Map(current);
      next.delete(projectId);
      return next;
    });
  }, []);

  return {
    rootRows: dashboardView.rootRows,
    allChildrenByParentId: dashboardView.allChildrenByParentId,
    visibleChildrenByParentId: dashboardView.visibleChildrenByParentId,
    parentsWithMatchingChildren: dashboardView.parentsWithMatchingChildren,
    paymentTasksIndex: resolvedPaymentTasksIndex,
    totalCount: allRoots.length,
    filteredCount: dashboardView.rootRows.length,
    isLoading,
    refetch: loadPipelineData,
    removeProject,
  };
}

export { EMPTY_CRM_PROJECTS_LIST_FILTERS };
