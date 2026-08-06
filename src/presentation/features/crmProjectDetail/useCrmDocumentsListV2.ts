'use client';

/**
 * Project Details → Documents tab list v2 (infinite scroll + new-document refresh).
 */

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE } from '@/domain/crm/documentsListV2';
import {
  fetchCrmDocumentsHasNewerV2,
  fetchCrmDocumentsListV2Page,
} from '@/infrastructure/crm/api/crmDocumentsListV2Api';
import {
  flattenDocumentsListV2PagesById,
  shouldFetchDocumentsListV2NextPage,
} from '@/presentation/features/crmProjectDetail/documentsListV2InfiniteScroll';

const SEARCH_DEBOUNCE_MS = 300;
const NEWER_POLL_MS = 45_000;

export type UseCrmDocumentsListV2Result = {
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  readonly debouncedSearch: string;
  readonly documents: readonly CrmDocumentMetadata[];
  readonly isLoading: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  readonly loadMore: () => void;
  readonly errorMessage: string | null;
  readonly showNewDocumentsBanner: boolean;
  readonly refreshToNewest: () => Promise<void>;
  readonly refetch: () => Promise<void>;
  readonly removeDocumentsLocally: (documentIds: readonly string[]) => void;
  readonly searchFingerprintKey: string;
};

function documentsListQueryKey(input: {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly search: string;
}) {
  return [
    'crm-documents-list-v2',
    input.projectId,
    input.projectSlug,
    input.search,
    CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE,
  ] as const;
}

export function useCrmDocumentsListV2(input: {
  readonly projectSlug: string;
  readonly projectId: string;
}): UseCrmDocumentsListV2Result {
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

  const listKey = documentsListQueryKey({
    projectId,
    projectSlug,
    search: debouncedSearch,
  });

  const listQuery = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam, signal }) =>
      fetchCrmDocumentsListV2Page({
        projectSlug,
        searchInput: debouncedSearch,
        limit: CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE,
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

  const documents = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    return flattenDocumentsListV2PagesById(pages);
  }, [listQuery.data?.pages]);

  const newest = documents[0] ?? null;
  const newestKey = newest != null ? `${newest.uploadedAt}|${newest.id}` : null;

  const probeQuery = useQuery({
    queryKey: ['crm-documents-list-v2-newer', projectSlug, newestKey],
    queryFn: ({ signal }) => {
      if (newest == null) {
        return Promise.resolve({ hasNewer: false });
      }
      return fetchCrmDocumentsHasNewerV2({
        projectSlug,
        afterCreatedAt: newest.uploadedAt,
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
      !shouldFetchDocumentsListV2NextPage({
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
      queryKey: ['crm-documents-list-v2-newer', projectSlug],
    });
  }, [listKey, projectSlug, queryClient]);

  const removeDocumentsLocally = useCallback(
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
        ? 'Failed to load Documents'
        : null;

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    documents,
    isLoading: listQuery.isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    errorMessage,
    showNewDocumentsBanner: Boolean(probeQuery.data?.hasNewer),
    refreshToNewest,
    refetch,
    removeDocumentsLocally,
    searchFingerprintKey: debouncedSearch,
  };
}
