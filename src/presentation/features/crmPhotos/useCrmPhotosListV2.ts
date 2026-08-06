'use client';

/**
 * Organization-wide Photos list v2 (infinite scroll + new-photo refresh).
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
  type CrmPhotoListItemV2,
} from '@/domain/crm/photosListV2';
import {
  fetchCrmPhotosHasNewerV2,
  fetchCrmPhotosListV2Page,
} from '@/infrastructure/crm/api/crmPhotosListV2Api';
import {
  flattenListV2PagesById,
  shouldFetchListV2NextPage,
} from '@/presentation/features/listV2/listV2InfiniteScroll';

const SEARCH_DEBOUNCE_MS = 300;
const NEWER_POLL_MS = 45_000;

export type UseCrmPhotosListV2Result = {
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  readonly debouncedSearch: string;
  readonly photos: readonly CrmPhotoListItemV2[];
  readonly isLoading: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  readonly loadMore: () => void;
  readonly errorMessage: string | null;
  readonly showNewPhotosBanner: boolean;
  readonly refreshToNewest: () => Promise<void>;
  readonly refetch: () => Promise<void>;
  readonly removePhotosLocally: (documentIds: readonly string[]) => void;
  readonly searchFingerprintKey: string;
};

function photosListQueryKey(input: { readonly search: string }) {
  return [
    'crm-photos-list-v2',
    input.search,
    CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
  ] as const;
}

export function useCrmPhotosListV2(): UseCrmPhotosListV2Result {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const didInitQueryRef = useRef(false);

  useEffect(() => {
    if (didInitQueryRef.current) return;
    didInitQueryRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const initialQuery = (params.get('q') ?? params.get('project') ?? '').trim();
    if (!initialQuery) return;
    setSearchInput(initialQuery);
    setDebouncedSearch(initialQuery);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listKey = photosListQueryKey({ search: debouncedSearch });

  const listQuery = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam, signal }) =>
      fetchCrmPhotosListV2Page({
        searchInput: debouncedSearch,
        limit: CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
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

  const photos = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    return flattenListV2PagesById(pages);
  }, [listQuery.data?.pages]);

  const newest = photos[0] ?? null;
  const newestKey = newest != null ? `${newest.document.uploadedAt}|${newest.id}` : null;

  const probeQuery = useQuery({
    queryKey: ['crm-photos-list-v2-newer', newestKey],
    queryFn: ({ signal }) => {
      if (newest == null) {
        return Promise.resolve({ hasNewer: false });
      }
      return fetchCrmPhotosHasNewerV2({
        afterCreatedAt: newest.document.uploadedAt,
        afterId: newest.id,
        signal,
      });
    },
    enabled: newest != null && !listQuery.isFetching,
    refetchInterval: NEWER_POLL_MS,
    refetchOnWindowFocus: true,
  });

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
    await queryClient.resetQueries({ queryKey: listKey });
    await queryClient.invalidateQueries({
      queryKey: ['crm-photos-list-v2-newer'],
    });
  }, [listKey, queryClient]);

  const removePhotosLocally = useCallback(
    (documentIds: readonly string[]) => {
      const idSet = new Set(documentIds);
      queryClient.setQueryData(listKey, (current: unknown) => {
        if (
          current == null ||
          typeof current !== 'object' ||
          !('pages' in current) ||
          !Array.isArray((current as { pages: unknown }).pages)
        ) {
          return current;
        }
        const typed = current as {
          pages: Array<{ items: Array<{ id: string }> }>;
          pageParams: unknown;
        };
        return {
          ...typed,
          pages: typed.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => !idSet.has(item.id)),
          })),
        };
      });
    },
    [listKey, queryClient]
  );

  const errorMessage =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : listQuery.isError
        ? 'Failed to load Photos'
        : null;

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    photos,
    isLoading: listQuery.isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    errorMessage,
    showNewPhotosBanner: Boolean(probeQuery.data?.hasNewer),
    refreshToNewest,
    refetch,
    removePhotosLocally,
    searchFingerprintKey: debouncedSearch,
  };
}
