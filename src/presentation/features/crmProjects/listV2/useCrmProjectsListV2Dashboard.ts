'use client';

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2PageSize,
  CrmProjectsListV2PageSummary,
  CrmProjectsListV2RootListItem,
} from '@/domain/crm/projectsListV2';
import { CRM_PROJECTS_LIST_V2_SEARCH_MIN_LENGTH } from '@/domain/crm/projectsListV2';
import {
  fetchCrmProjectsListV2Count,
  fetchCrmProjectsListV2Page,
  fetchCrmProjectsListV2Summaries,
} from '@/infrastructure/crm/api/crmProjectsListV2Api';
import type { CrmProjectsListFilters } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import {
  buildCrmProjectsListV2RequestFromUi,
  buildCrmProjectsListV2UrlSearchParams,
  parseCrmProjectsListV2UrlState,
} from './crmProjectsListV2UrlState';
import {
  crmProjectsListV2CountQueryKey,
  crmProjectsListV2OrgQueryKeyPrefix,
  crmProjectsListV2PageQueryKey,
  crmProjectsListV2SummariesQueryKey,
} from './projectsListV2QueryKeys';
import { formatCrmProjectsListV2Range } from './formatCrmProjectsListV2Range';

const SEARCH_DEBOUNCE_MS = 300;
const NEW_RECORDS_POLL_MS = 45_000;

export function invalidateCrmProjectsListV2Queries(
  queryClient: QueryClient,
  organizationId: string
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: crmProjectsListV2OrgQueryKeyPrefix(organizationId),
  });
}

export type UseCrmProjectsListV2DashboardResult = {
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  readonly filters: CrmProjectsListFilters;
  readonly setFilters: (filters: CrmProjectsListFilters) => void;
  readonly limit: CrmProjectsListV2PageSize;
  readonly setLimit: (limit: CrmProjectsListV2PageSize) => void;
  readonly items: readonly CrmProjectsListV2RootListItem[];
  readonly pageSummariesById: ReadonlyMap<string, CrmProjectsListV2PageSummary>;
  readonly totalCount: number | null;
  readonly rangeLabel: string;
  readonly isLoading: boolean;
  readonly isFetchingPage: boolean;
  readonly isSummariesLoading: boolean;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly goNextPage: () => void;
  readonly goPreviousPage: () => void;
  readonly showNewProjectsBanner: boolean;
  readonly dismissNewProjectsBanner: () => void;
  readonly refetch: () => Promise<void>;
  readonly removeProjectLocally: (projectId: string) => void;
  readonly patchProjectSummaryLocally: (summary: CrmProjectsListV2RootListItem) => void;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly errorMessage: string | null;
};

export function useCrmProjectsListV2Dashboard(input: {
  readonly organizationId: string;
}): UseCrmProjectsListV2DashboardResult {
  const { organizationId } = input;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlStateKey = searchParams.toString();
  const urlState = useMemo(
    () => parseCrmProjectsListV2UrlState(new URLSearchParams(urlStateKey)),
    [urlStateKey]
  );

  const [searchInput, setSearchInputState] = useState(urlState.searchInput);
  const [filters, setFiltersState] = useState<CrmProjectsListFilters>(urlState.filters);
  const [limit, setLimitState] = useState<CrmProjectsListV2PageSize>(urlState.limit);
  const [cursor, setCursorState] = useState<string | null>(urlState.cursor);
  const [pageIndex, setPageIndex] = useState<number | null>(
    urlState.pageIndex ?? (urlState.cursor == null ? 0 : null)
  );
  const [debouncedSearch, setDebouncedSearch] = useState(urlState.searchInput);
  const [baselineCount, setBaselineCount] = useState<number | null>(null);
  const [showNewProjectsBanner, setShowNewProjectsBanner] = useState(false);
  const skipUrlWriteRef = useRef(false);

  // Sync local draft from browser Back/Forward URL changes.
  useEffect(() => {
    skipUrlWriteRef.current = true;
    setSearchInputState(urlState.searchInput);
    setDebouncedSearch(urlState.searchInput);
    setFiltersState(urlState.filters);
    setLimitState(urlState.limit);
    setCursorState(urlState.cursor);
    setPageIndex((current) => {
      if (urlState.pageIndex != null) return urlState.pageIndex;
      if (urlState.cursor == null) return 0;
      // Keep the locally tracked index when the URL has a cursor but no page
      // (avoids wiping after Next before `page` is written / on legacy links).
      return current;
    });
  }, [urlState]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const request = useMemo(
    () =>
      buildCrmProjectsListV2RequestFromUi({
        searchInput: debouncedSearch,
        filters,
        limit,
      }),
    [debouncedSearch, filters, limit]
  );

  // Reset to first page when search/filters/limit change (not when only cursor changes).
  const fingerprintRef = useRef(request.fingerprint);
  useEffect(() => {
    if (fingerprintRef.current === request.fingerprint) return;
    fingerprintRef.current = request.fingerprint;
    setCursorState(null);
    setPageIndex(0);
  }, [request.fingerprint]);

  // Write URL from local state (replace for search typing; push for cursor navigation).
  useEffect(() => {
    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }
    const next = buildCrmProjectsListV2UrlSearchParams({
      searchInput: debouncedSearch,
      filters,
      limit,
      cursor,
      pageIndex,
    });
    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) return;
    const href = nextQs ? `${pathname}?${nextQs}` : pathname;
    // Cursor changes are navigations; filter/search/limit resets replace.
    if (cursor != null && cursor !== urlState.cursor) {
      router.push(href, { scroll: false });
    } else {
      router.replace(href, { scroll: false });
    }
  }, [
    cursor,
    debouncedSearch,
    filters,
    limit,
    pageIndex,
    pathname,
    router,
    searchParams,
    urlState.cursor,
  ]);

  const pageQuery = useQuery({
    queryKey: crmProjectsListV2PageQueryKey({
      organizationId,
      request,
      cursor,
    }),
    queryFn: ({ signal }) =>
      fetchCrmProjectsListV2Page({ request, cursor, signal }),
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 30_000,
  });

  const countQuery = useQuery({
    queryKey: crmProjectsListV2CountQueryKey({ organizationId, request }),
    queryFn: ({ signal }) => fetchCrmProjectsListV2Count({ request, signal }),
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 60_000,
    refetchInterval: NEW_RECORDS_POLL_MS,
  });

  const items = useMemo(
    () => pageQuery.data?.items ?? [],
    [pageQuery.data?.items]
  );
  const projectIds = useMemo(() => items.map((item) => item.id), [items]);

  const summariesQuery = useQuery({
    queryKey: crmProjectsListV2SummariesQueryKey({ organizationId, projectIds }),
    queryFn: ({ signal }) =>
      fetchCrmProjectsListV2Summaries({ projectIds, signal }),
    enabled: projectIds.length > 0,
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 30_000,
  });

  // Prefetch next page.
  useEffect(() => {
    const nextCursor = pageQuery.data?.pageInfo.nextCursor ?? null;
    if (!pageQuery.data?.pageInfo.hasNextPage || nextCursor == null) return;
    void queryClient.prefetchQuery({
      queryKey: crmProjectsListV2PageQueryKey({
        organizationId,
        request,
        cursor: nextCursor,
      }),
      queryFn: ({ signal }) =>
        fetchCrmProjectsListV2Page({ request, cursor: nextCursor, signal }),
      staleTime: 30_000,
    });
  }, [organizationId, pageQuery.data, queryClient, request]);

  // Empty-page fallback → previous cursor or first page.
  useEffect(() => {
    if (pageQuery.isFetching || pageQuery.isLoading) return;
    if (pageQuery.data == null) return;
    if (pageQuery.data.items.length > 0) return;
    if (cursor == null) return;
    const previous = pageQuery.data.pageInfo.previousCursor;
    if (previous != null && pageQuery.data.pageInfo.hasPreviousPage) {
      setCursorState(previous);
      setPageIndex((current) => (current != null && current > 0 ? current - 1 : null));
      return;
    }
    setCursorState(null);
    setPageIndex(0);
  }, [cursor, pageQuery.data, pageQuery.isFetching, pageQuery.isLoading]);

  // New-records banner when polled count grows past baseline.
  useEffect(() => {
    const total = countQuery.data?.totalCount;
    if (total == null) return;
    if (baselineCount == null) {
      setBaselineCount(total);
      return;
    }
    if (total > baselineCount) {
      setShowNewProjectsBanner(true);
    }
  }, [baselineCount, countQuery.data?.totalCount]);

  const pageSummariesById = useMemo(() => {
    const map = new Map<string, CrmProjectsListV2PageSummary>();
    const byId = summariesQuery.data?.byProjectId ?? {};
    for (const [id, summary] of Object.entries(byId)) {
      map.set(id, summary);
    }
    // Prefer page-item childCount when summary omits it.
    for (const item of items) {
      const existing = map.get(item.id);
      if (existing == null) continue;
      if (existing.childCount == null) {
        map.set(item.id, { ...existing, childCount: item.childCount });
      }
    }
    return map;
  }, [items, summariesQuery.data?.byProjectId]);

  const totalCount = countQuery.data?.totalCount ?? null;
  const hasNextPage = pageQuery.data?.pageInfo.hasNextPage ?? false;
  const hasPreviousPage =
    pageQuery.data?.pageInfo.hasPreviousPage ?? cursor != null;
  const rangeLabel = formatCrmProjectsListV2Range({
    pageItemCount: items.length,
    limit,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    pageIndex,
  });

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
  }, []);

  const setFilters = useCallback((next: CrmProjectsListFilters) => {
    setFiltersState({
      ...next,
      // Phase 1B: do not wire assignee / documents-required (still no-ops).
      assignedMemberIds: [],
      documentsRequired: [],
    });
  }, []);

  const setLimit = useCallback((next: CrmProjectsListV2PageSize) => {
    setLimitState(next);
  }, []);

  const goNextPage = useCallback(() => {
    const next = pageQuery.data?.pageInfo.nextCursor ?? null;
    if (next == null || !pageQuery.data?.pageInfo.hasNextPage) return;
    setCursorState(next);
    setPageIndex((current) => (current == null ? null : current + 1));
  }, [pageQuery.data?.pageInfo.hasNextPage, pageQuery.data?.pageInfo.nextCursor]);

  const goPreviousPage = useCallback(() => {
    const previous = pageQuery.data?.pageInfo.previousCursor ?? null;
    if (previous == null || !pageQuery.data?.pageInfo.hasPreviousPage) {
      setCursorState(null);
      setPageIndex(0);
      return;
    }
    setCursorState(previous);
    setPageIndex((current) => (current == null ? null : Math.max(0, current - 1)));
  }, [pageQuery.data?.pageInfo.hasPreviousPage, pageQuery.data?.pageInfo.previousCursor]);

  const refetch = useCallback(async () => {
    await invalidateCrmProjectsListV2Queries(queryClient, organizationId);
    const latest = queryClient.getQueryData<{ totalCount: number }>(
      crmProjectsListV2CountQueryKey({ organizationId, request })
    );
    if (latest?.totalCount != null) {
      setBaselineCount(latest.totalCount);
    } else if (countQuery.data?.totalCount != null) {
      setBaselineCount(countQuery.data.totalCount);
    }
    setShowNewProjectsBanner(false);
  }, [countQuery.data?.totalCount, organizationId, queryClient, request]);

  const dismissNewProjectsBanner = useCallback(() => {
    setShowNewProjectsBanner(false);
    if (countQuery.data?.totalCount != null) {
      setBaselineCount(countQuery.data.totalCount);
    }
  }, [countQuery.data?.totalCount]);

  const removeProjectLocally = useCallback(
    (projectId: string) => {
      queryClient.setQueryData(
        crmProjectsListV2PageQueryKey({ organizationId, request, cursor }),
        (
          current:
            | Awaited<ReturnType<typeof fetchCrmProjectsListV2Page>>
            | undefined
        ) => {
          if (current == null) return current;
          return {
            ...current,
            items: current.items.filter((item) => item.id !== projectId),
          };
        }
      );
      void invalidateCrmProjectsListV2Queries(queryClient, organizationId);
    },
    [cursor, organizationId, queryClient, request]
  );

  const patchProjectSummaryLocally = useCallback(
    (summary: CrmProjectsListV2RootListItem) => {
      queryClient.setQueryData(
        crmProjectsListV2PageQueryKey({ organizationId, request, cursor }),
        (
          current:
            | Awaited<ReturnType<typeof fetchCrmProjectsListV2Page>>
            | undefined
        ) => {
          if (current == null) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === summary.id ? { ...item, ...summary } : item
            ),
          };
        }
      );
    },
    [cursor, organizationId, queryClient, request]
  );

  const searchActive =
    debouncedSearch.trim().length >= CRM_PROJECTS_LIST_V2_SEARCH_MIN_LENGTH;
  void searchActive;

  const errorMessage =
    pageQuery.error instanceof Error
      ? pageQuery.error.message
      : countQuery.error instanceof Error
        ? countQuery.error.message
        : null;

  return {
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    limit,
    setLimit,
    items,
    pageSummariesById,
    totalCount,
    rangeLabel,
    isLoading: pageQuery.isLoading && pageQuery.data == null,
    isFetchingPage: pageQuery.isFetching,
    isSummariesLoading: summariesQuery.isLoading || summariesQuery.isFetching,
    hasNextPage,
    hasPreviousPage,
    goNextPage,
    goPreviousPage,
    showNewProjectsBanner,
    dismissNewProjectsBanner,
    refetch,
    removeProjectLocally,
    patchProjectSummaryLocally,
    request,
    errorMessage,
  };
}
