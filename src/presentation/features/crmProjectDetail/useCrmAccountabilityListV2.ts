'use client';

/**
 * Project Details → Accountability tab list v2 (infinite scroll + new-activity refresh).
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrmAccountabilityAction } from '@/domain/crm';
import {
  CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE,
  type CrmAccountabilityListItem,
} from '@/domain/crm/accountabilityListV2';
import {
  fetchCrmAccountabilityHasNewerV2,
  fetchCrmAccountabilityListV2Page,
} from '@/infrastructure/crm/api/crmAccountabilityListV2Api';
import {
  flattenListV2PagesById,
  shouldFetchListV2NextPage,
} from '@/presentation/features/listV2/listV2InfiniteScroll';

const SEARCH_DEBOUNCE_MS = 300;
const NEWER_POLL_MS = 45_000;

export type UseCrmAccountabilityListV2Result = {
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  readonly entries: readonly CrmAccountabilityAction[];
  readonly isLoading: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  readonly loadMore: () => void;
  readonly errorMessage: string | null;
  readonly showNewActivityBanner: boolean;
  readonly refreshToNewest: () => Promise<void>;
  readonly refetch: () => Promise<void>;
};

function toUiEntries(
  items: readonly CrmAccountabilityListItem[]
): readonly CrmAccountabilityAction[] {
  return items.map(({ eventType: _eventType, ...rest }) => rest);
}

function accountabilityListQueryKey(input: {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly search: string;
}) {
  return [
    'crm-accountability-list-v2',
    input.projectId,
    input.projectSlug,
    input.search,
    CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE,
  ] as const;
}

export function useCrmAccountabilityListV2(input: {
  readonly projectSlug: string;
  readonly projectId: string;
}): UseCrmAccountabilityListV2Result {
  const { projectSlug, projectId } = input;
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listKey = accountabilityListQueryKey({
    projectId,
    projectSlug,
    search: debouncedSearch,
  });

  const listQuery = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam, signal }) =>
      fetchCrmAccountabilityListV2Page({
        projectSlug,
        searchInput: debouncedSearch,
        limit: CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE,
        cursor: pageParam,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor : undefined,
  });

  const hasNextPage = Boolean(listQuery.hasNextPage);
  const isFetchingNextPage = listQuery.isFetchingNextPage;
  const fetchNextPage = listQuery.fetchNextPage;
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isFetchingNextPage) inFlightRef.current = false;
  }, [isFetchingNextPage]);

  const entries = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    const items = flattenListV2PagesById(pages);
    return toUiEntries(items);
  }, [listQuery.data?.pages]);

  const newest = entries[0] ?? null;
  const newestKey = newest != null ? `${newest.at}|${newest.id}` : null;

  const probeQuery = useQuery({
    queryKey: ['crm-accountability-list-v2-newer', projectSlug, newestKey],
    queryFn: ({ signal }) => {
      if (newest == null) {
        return Promise.resolve({ hasNewer: false });
      }
      return fetchCrmAccountabilityHasNewerV2({
        projectSlug,
        afterCreatedAt: newest.at,
        afterId: newest.id,
        signal,
      });
    },
    enabled: newest != null && !listQuery.isFetching,
    refetchInterval: NEWER_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const showNewActivityBanner = Boolean(probeQuery.data?.hasNewer);

  const loadMore = useCallback(() => {
    if (
      !shouldFetchListV2NextPage({
        hasNextPage,
        isFetchingNextPage,
        inFlight: inFlightRef.current,
      })
    ) {
      return;
    }
    inFlightRef.current = true;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const refetch = useCallback(async () => {
    await listQuery.refetch();
  }, [listQuery]);

  const refreshToNewest = useCallback(async () => {
    // Reset to the newest first page (do not auto-prepend onto older pages).
    await queryClient.resetQueries({ queryKey: listKey });
    await queryClient.invalidateQueries({
      queryKey: ['crm-accountability-list-v2-newer', projectSlug],
    });
  }, [listKey, projectSlug, queryClient]);

  const errorMessage =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : listQuery.isError
        ? 'Failed to load Accountability'
        : null;

  return {
    searchInput,
    setSearchInput,
    entries,
    isLoading: listQuery.isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    errorMessage,
    showNewActivityBanner,
    refreshToNewest,
    refetch,
  };
}
