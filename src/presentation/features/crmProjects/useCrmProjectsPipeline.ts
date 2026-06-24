'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import {
  listCrmProjectSummaries,
  listCrmProjectSummariesSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  EMPTY_CRM_PROJECTS_DASHBOARD_VIEW,
  applyRadiusFilterToDashboardView,
  collectDashboardRadiusFilterCandidates,
  filterDashboardProjectSummaries,
  partitionCrmProjectSummaries,
  type CrmProjectListFilterContext,
  type CrmProjectsListFilters,
} from './crmProjectsPipelineViewModel';
import {
  EMPTY_RADIUS_FILTER,
  isRadiusFilterActive,
  type RadiusFilterState,
} from '@/presentation/features/filters/radiusFilterModel';
import { useRadiusFilteredProjects } from '@/presentation/features/filters/useRadiusFilteredProjects';

const EMPTY_PROJECT_SUMMARIES: readonly CrmProjectSummary[] = [];

export function useCrmProjectsPipeline(
  searchQuery: string,
  filters: CrmProjectsListFilters,
  radiusFilter: RadiusFilterState = EMPTY_RADIUS_FILTER
): {
  rootRows: CrmProjectSummary[];
  allChildrenByParentId: Map<string, CrmProjectSummary[]>;
  visibleChildrenByParentId: Map<string, CrmProjectSummary[]>;
  parentsWithMatchingChildren: Set<string>;
  paymentTasksIndex: CrmProjectPaymentTasksIndex;
  workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  isRadiusGeocoding: boolean;
  radiusGeocodingError: string | null;
  isPaymentFinancialsLoading: boolean;
  isWorkflowProgressLoading: boolean;
  refetch: () => Promise<void>;
  removeProject: (projectId: string) => void;
  patchProjectSummary: (summary: CrmProjectSummary) => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const {
    paymentTasksIndex,
    workflowTaskStatusIndex,
    workflowProgressInputIndex,
    isLoading: isRollupIndexesLoading,
    refetch: refetchRollupIndexes,
  } = useCrmPaymentTasksIndexContext();
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
    await Promise.all([loadSummaries(), refetchRollupIndexes()]);
  }, [loadSummaries, refetchRollupIndexes]);

  useEffect(() => {
    void loadSummaries();
    void refetchRollupIndexes();
  }, [isApiSource, loadSummaries, refetchRollupIndexes]);

  const summaries = allSummaries ?? EMPTY_PROJECT_SUMMARIES;
  const isLoading = allSummaries === null;
  const isPaymentFinancialsLoading = isRollupIndexesLoading;

  const filterContext = useMemo(
    (): CrmProjectListFilterContext => ({
      workflowTaskStatusIndex,
      workflowTaskStatusIndexReady: !isRollupIndexesLoading,
    }),
    [isRollupIndexesLoading, workflowTaskStatusIndex]
  );

  const preFilteredView = useMemo(
    () => filterDashboardProjectSummaries(summaries, searchQuery, filters, filterContext),
    [summaries, searchQuery, filters, filterContext]
  );

  const radiusFilterCandidates = useMemo(
    () => collectDashboardRadiusFilterCandidates(preFilteredView),
    [preFilteredView]
  );

  const {
    rows: radiusFilteredProjects,
    isGeocoding: isRadiusGeocoding,
    geocodingError: radiusGeocodingError,
    isRadiusFilterActive: radiusActive,
  } = useRadiusFilteredProjects(radiusFilterCandidates, radiusFilter);

  const dashboardView = useMemo(() => {
    if (!radiusActive) {
      return preFilteredView;
    }

    if (isRadiusGeocoding || radiusGeocodingError != null) {
      return EMPTY_CRM_PROJECTS_DASHBOARD_VIEW;
    }

    const matchingProjectIds = new Set(radiusFilteredProjects.map((project) => project.id));
    return applyRadiusFilterToDashboardView(preFilteredView, matchingProjectIds);
  }, [
    isRadiusGeocoding,
    preFilteredView,
    radiusActive,
    radiusFilteredProjects,
    radiusGeocodingError,
  ]);

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
    workflowProgressInputIndex,
    totalCount: allRoots.length,
    filteredCount: dashboardView.rootRows.length,
    isLoading,
    isRadiusGeocoding,
    radiusGeocodingError,
    isPaymentFinancialsLoading,
    isWorkflowProgressLoading: isRollupIndexesLoading,
    refetch,
    removeProject,
    patchProjectSummary,
  };
}

export { EMPTY_CRM_PROJECTS_LIST_FILTERS, EMPTY_RADIUS_FILTER };
