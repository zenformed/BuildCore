'use client';

import { useSyncExternalStore } from 'react';

export const PROJECT_DETAIL_STACK_BREAKPOINT_PX = 1100;

const STACKED_MEDIA_QUERY = `(max-width: ${PROJECT_DETAIL_STACK_BREAKPOINT_PX}px)`;

function subscribeStackedLayout(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(STACKED_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getStackedLayoutSnapshot(): boolean {
  return window.matchMedia(STACKED_MEDIA_QUERY).matches;
}

/** True when workflow and payments panels stack in a single column. */
export function useProjectDetailStackedLayout(): boolean {
  return useSyncExternalStore(
    subscribeStackedLayout,
    getStackedLayoutSnapshot,
    () => false
  );
}
