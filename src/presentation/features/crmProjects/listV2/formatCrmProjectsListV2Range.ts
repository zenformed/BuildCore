/**
 * Format range text like `101–150 of 6,806` for Projects list v2 pagination chrome.
 *
 * Prefers pager flags over a fragile pageIndex:
 * - first page (!hasPreviousPage) → 1–N
 * - last page (!hasNextPage + total) → (total-N+1)–total
 * - middle pages use pageIndex when known
 */

export function formatCrmProjectsListV2Range(input: {
  readonly pageItemCount: number;
  readonly limit: number;
  readonly totalCount: number | null;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  /** 0-based page index when walking forward from first page; null if unknown. */
  readonly pageIndex: number | null;
}): string {
  if (input.pageItemCount === 0) {
    if (input.totalCount == null) return '0 of …';
    return `0 of ${input.totalCount.toLocaleString()}`;
  }

  const totalLabel =
    input.totalCount == null ? '…' : input.totalCount.toLocaleString();

  // First page is unambiguous without pageIndex.
  if (!input.hasPreviousPage) {
    const start = 1;
    const end = input.pageItemCount;
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${totalLabel}`;
  }

  // Last page: derive absolute range from total + items on page.
  if (!input.hasNextPage && input.totalCount != null) {
    const end = input.totalCount;
    const start = Math.max(1, end - input.pageItemCount + 1);
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${totalLabel}`;
  }

  // Middle pages (or unknown totals) need a known page index.
  if (input.pageIndex != null && input.pageIndex >= 0) {
    const start = input.pageIndex * input.limit + 1;
    const end = start + input.pageItemCount - 1;
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${totalLabel}`;
  }

  // Without a known page index (legacy cursor deep-link), show count on page.
  return `${input.pageItemCount.toLocaleString()} of ${totalLabel}`;
}
