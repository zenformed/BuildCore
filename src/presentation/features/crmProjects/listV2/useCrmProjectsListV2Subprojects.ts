'use client';

/**
 * Project Details → Subprojects list v2 (Phase 2B).
 * TanStack Query + URL state, mirrored from the dashboard roots hook.
 */

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CrmProjectSummary } from '@/domain/crm';
import type {
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2PageSize,
  CrmProjectsListV2PageSummary,
} from '@/domain/crm/projectsListV2';
import {
  fetchCrmChildProjectsListV2Count,
  fetchCrmChildProjectsListV2Page,
  fetchCrmProjectsListV2Summaries,
} from '@/infrastructure/crm/api/crmProjectsListV2Api';
import type { CrmProjectsListFilters } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import {
  buildCrmProjectsListV2ChildrenRequestFromUi,
  buildCrmProjectsListV2UrlSearchParams,
  mergeCrmProjectsListV2UrlSearchParams,
  parseCrmProjectsListV2ChildrenUrlState,
} from './crmProjectsListV2UrlState';
import {
  crmProjectsListV2CountQueryKey,
  crmProjectsListV2PageQueryKey,
  crmProjectsListV2SummariesQueryKey,
} from './projectsListV2QueryKeys';
import { formatCrmProjectsListV2Range } from './formatCrmProjectsListV2Range';
import { invalidateCrmProjectsListV2Queries } from './useCrmProjectsListV2Dashboard';

const SEARCH_DEBOUNCE_MS = 300;

export type UseCrmProjectsListV2SubprojectsResult = {
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  readonly filters: CrmProjectsListFilters;
  readonly setFilters: (filters: CrmProjectsListFilters) => void;
  readonly limit: CrmProjectsListV2PageSize;
  readonly setLimit: (limit: CrmProjectsListV2PageSize) => void;
  readonly items: readonly CrmProjectSummary[];
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
  readonly refetch: () => Promise<void>;
  readonly removeProjectLocally: (projectId: string) => void;
  readonly patchProjectSummaryLocally: (summary: CrmProjectSummary) => void;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly errorMessage: string | null;
};

export function useCrmProjectsListV2Subprojects(input: {
  readonly organizationId: string;
  readonly parentProjectId: string;
  readonly parentSlug: string;
}): UseCrmProjectsListV2SubprojectsResult {
  const { organizationId, parentProjectId, parentSlug } = input;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlState = useMemo(
    () =>
      parseCrmProjectsListV2ChildrenUrlState(
        new URLSearchParams(searchParams.toString()),
        parentProjectId
      ),
    [parentProjectId, searchParams]
  );

  const [searchInput, setSearchInputState] = useState(urlState.searchInput);
  const [filters, setFiltersState] = useState<CrmProjectsListFilters>(urlState.filters);
  const [limit, setLimitState] = useState<CrmProjectsListV2PageSize>(urlState.limit);
  const [cursor, setCursorState] = useState<string | null>(urlState.cursor);
  const [pageIndex, setPageIndex] = useState(urlState.cursor == null ? 0 : null);
  const [debouncedSearch, setDebouncedSearch] = useState(urlState.searchInput);
  const skipUrlWriteRef = useRef(false);

  useEffect(() => {
    skipUrlWriteRef.current = true;
    setSearchInputState(urlState.searchInput);
    setDebouncedSearch(urlState.searchInput);
    setFiltersState(urlState.filters);
    setLimitState(urlState.limit);
    setCursorState(urlState.cursor);
    setPageIndex(urlState.cursor == null ? 0 : null);
  }, [urlState]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const request = useMemo(
    () =>
      buildCrmProjectsListV2ChildrenRequestFromUi({
        parentProjectId,
        searchInput: debouncedSearch,
        filters,
        limit,
      }),
    [debouncedSearch, filters, limit, parentProjectId]
  );

  const fingerprintRef = useRef(request.fingerprint);
  useEffect(() => {
    if (fingerprintRef.current === request.fingerprint) return;
    fingerprintRef.current = request.fingerprint;
    setCursorState(null);
    setPageIndex(0);
  }, [request.fingerprint]);

  useEffect(() => {
    if (skipUrlWriteRef.current) {
      skipUrlWriteRef.current = false;
      return;
    }
    const listParams = buildCrmProjectsListV2UrlSearchParams({
      searchInput: debouncedSearch,
      filters,
      limit,
      cursor,
    });
    const next = mergeCrmProjectsListV2UrlSearchParams(
      new URLSearchParams(searchParams.toString()),
      listParams
    );
    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) return;
    const href = nextQs ? `${pathname}?${nextQs}` : pathname;
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
      fetchCrmChildProjectsListV2Page({
        parentSlug,
        request,
        cursor,
        signal,
      }),
    enabled: organizationId.trim() !== '' && parentSlug.trim() !== '',
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 30_000,
  });

  const countQuery = useQuery({
    queryKey: crmProjectsListV2CountQueryKey({ organizationId, request }),
    queryFn: ({ signal }) =>
      fetchCrmChildProjectsListV2Count({
        parentSlug,
        request,
        signal,
      }),
    enabled: organizationId.trim() !== '' && parentSlug.trim() !== '',
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 60_000,
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
        fetchCrmChildProjectsListV2Page({
          parentSlug,
          request,
          cursor: nextCursor,
          signal,
        }),
      staleTime: 30_000,
    });
  }, [organizationId, pageQuery.data, parentSlug, queryClient, request]);

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

  const pageSummariesById = useMemo(() => {
    const map = new Map<string, CrmProjectsListV2PageSummary>();
    const byId = summariesQuery.data?.byProjectId ?? {};
    for (const [id, summary] of Object.entries(byId)) {
      map.set(id, summary);
    }
    return map;
  }, [summariesQuery.data?.byProjectId]);

  const totalCount = countQuery.data?.totalCount ?? null;
  const rangeLabel = formatCrmProjectsListV2Range({
    pageItemCount: items.length,
    limit,
    totalCount,
    hasPreviousPage: pageQuery.data?.pageInfo.hasPreviousPage ?? false,
    pageIndex,
  });

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
  }, []);

  const setFilters = useCallback((next: CrmProjectsListFilters) => {
    setFiltersState({
      ...next,
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
  }, [organizationId, queryClient]);

  const removeProjectLocally = useCallback(
    (projectId: string) => {
      queryClient.setQueryData(
        crmProjectsListV2PageQueryKey({ organizationId, request, cursor }),
        (
          current:
            | Awaited<ReturnType<typeof fetchCrmChildProjectsListV2Page>>
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
    (summary: CrmProjectSummary) => {
      queryClient.setQueryData(
        crmProjectsListV2PageQueryKey({ organizationId, request, cursor }),
        (
          current:
            | Awaited<ReturnType<typeof fetchCrmChildProjectsListV2Page>>
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
    hasNextPage: pageQuery.data?.pageInfo.hasNextPage ?? false,
    hasPreviousPage: pageQuery.data?.pageInfo.hasPreviousPage ?? cursor != null,
    goNextPage,
    goPreviousPage,
    refetch,
    removeProjectLocally,
    patchProjectSummaryLocally,
    request,
    errorMessage,
  };
}
