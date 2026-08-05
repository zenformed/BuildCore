/**
 * Format range text like `101–150 of 6,806` for Projects list v2 pagination chrome.
 */

export function formatCrmProjectsListV2Range(input: {
  readonly pageItemCount: number;
  readonly limit: number;
  readonly totalCount: number | null;
  readonly hasPreviousPage: boolean;
  /** 0-based page index estimate when walking forward from first page; null if unknown. */
  readonly pageIndex: number | null;
}): string {
  if (input.pageItemCount === 0) {
    if (input.totalCount == null) return '0 of …';
    return `0 of ${input.totalCount.toLocaleString()}`;
  }

  const totalLabel =
    input.totalCount == null ? '…' : input.totalCount.toLocaleString();

  if (input.pageIndex != null && input.pageIndex >= 0) {
    const start = input.pageIndex * input.limit + 1;
    const end = start + input.pageItemCount - 1;
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${totalLabel}`;
  }

  // Without a known page index (e.g. after arbitrary cursor restore), show count on page.
  return `${input.pageItemCount.toLocaleString()} of ${totalLabel}`;
}
