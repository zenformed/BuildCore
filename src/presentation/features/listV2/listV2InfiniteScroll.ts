/**
 * Shared list-v2 infinite-scroll helpers (Documents, Accountability, …).
 * Feature-agnostic: no Documents/Accountability-specific behavior.
 */

export const LIST_V2_INFINITE_SCROLL_ROOT_MARGIN = '400px 0px';

export function shouldObserveListV2Sentinel(input: {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly enabled: boolean;
}): boolean {
  return input.enabled && input.hasNextPage && !input.isFetchingNextPage;
}

export function shouldFetchListV2NextPage(input: {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly inFlight: boolean;
}): boolean {
  return input.hasNextPage && !input.isFetchingNextPage && !input.inFlight;
}

export function isIntersectionObserverAvailable(
  globalObject: { IntersectionObserver?: unknown } = globalThis
): boolean {
  return typeof globalObject.IntersectionObserver === 'function';
}

/** Flatten pages with first-seen ID winning (guards duplicate rows across pages). */
export function flattenListV2PagesById<T extends { readonly id: string }>(
  pages: readonly { readonly items: readonly T[] }[]
): T[] {
  const byId = new Map<string, T>();
  for (const page of pages) {
    for (const item of page.items) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}
