'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import {
  DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  isIntersectionObserverAvailable,
  shouldFetchDocumentsListV2NextPage,
  shouldObserveDocumentsListV2Sentinel,
} from '@/presentation/features/crmProjectDetail/documentsListV2InfiniteScroll';
import styles from './ProjectDetail.module.css';

export type DocumentsListV2InfiniteScrollFooterProps = {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onFetchNextPage: () => void;
  readonly loadingLabel: string;
  readonly loadMoreLabel: string;
  /** When false (e.g. missing-only filter), render nothing. */
  readonly enabled?: boolean;
};

/**
 * Sentinel at the end of the Documents v2 list for IntersectionObserver infinite scroll.
 * Falls back to a compact Load More button when IntersectionObserver is unavailable.
 */
export function DocumentsListV2InfiniteScrollFooter({
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  loadingLabel,
  loadMoreLabel,
  enabled = true,
}: DocumentsListV2InfiniteScrollFooterProps): ReactElement | null {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const onFetchNextPageRef = useRef(onFetchNextPage);
  const observerSupported = isIntersectionObserverAvailable();

  useEffect(() => {
    onFetchNextPageRef.current = onFetchNextPage;
  }, [onFetchNextPage]);

  useEffect(() => {
    if (!isFetchingNextPage) {
      inFlightRef.current = false;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (!observerSupported) return;
    if (
      !shouldObserveDocumentsListV2Sentinel({
        hasNextPage,
        isFetchingNextPage,
        enabled,
      })
    ) {
      return;
    }

    const node = sentinelRef.current;
    if (node == null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
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
        onFetchNextPageRef.current();
      },
      { rootMargin: DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, observerSupported]);

  if (!enabled || (!hasNextPage && !isFetchingNextPage)) {
    return null;
  }

  if (!observerSupported) {
    return (
      <div className={styles.documentsLoadMoreWrap}>
        <button
          type="button"
          className={styles.documentsLoadMoreButton}
          disabled={isFetchingNextPage || !hasNextPage}
          onClick={() => {
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
            onFetchNextPage();
          }}
        >
          {isFetchingNextPage ? loadingLabel : loadMoreLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.documentsInfiniteScrollFooter}>
      <div
        ref={sentinelRef}
        className={styles.documentsInfiniteScrollSentinel}
        aria-hidden
      />
      {isFetchingNextPage ? (
        <p className={styles.documentsInfiniteScrollLoading} role="status" aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}
    </div>
  );
}
