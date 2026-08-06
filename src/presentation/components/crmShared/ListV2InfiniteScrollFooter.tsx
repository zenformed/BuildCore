'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import {
  LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  isIntersectionObserverAvailable,
  shouldFetchListV2NextPage,
  shouldObserveListV2Sentinel,
} from '@/presentation/features/listV2/listV2InfiniteScroll';
import styles from './listV2InfiniteScroll.module.css';

export type ListV2InfiniteScrollFooterProps = {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onFetchNextPage: () => void;
  readonly loadingLabel: string;
  readonly loadMoreLabel: string;
  /** When false, render nothing. */
  readonly enabled?: boolean;
};

/**
 * End-of-list sentinel for list-v2 infinite scroll.
 * Falls back to a compact Load More button when IntersectionObserver is unavailable.
 */
export function ListV2InfiniteScrollFooter({
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  loadingLabel,
  loadMoreLabel,
  enabled = true,
}: ListV2InfiniteScrollFooterProps): ReactElement | null {
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
      !shouldObserveListV2Sentinel({
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
          !shouldFetchListV2NextPage({
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
      { rootMargin: LIST_V2_INFINITE_SCROLL_ROOT_MARGIN }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, observerSupported]);

  if (!enabled || (!hasNextPage && !isFetchingNextPage)) {
    return null;
  }

  if (!observerSupported) {
    return (
      <div className={styles.loadMoreWrap}>
        <button
          type="button"
          className={styles.loadMoreButton}
          disabled={isFetchingNextPage || !hasNextPage}
          onClick={() => {
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
            onFetchNextPage();
          }}
        >
          {isFetchingNextPage ? loadingLabel : loadMoreLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.footer}>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
      {isFetchingNextPage ? (
        <p className={styles.loading} role="status" aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}
    </div>
  );
}
