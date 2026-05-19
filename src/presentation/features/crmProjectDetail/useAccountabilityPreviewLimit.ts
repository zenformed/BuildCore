'use client';

import { useSyncExternalStore } from 'react';
import {
  VIEWPORT_1920X1080_MEDIA,
  VIEWPORT_2K_MEDIA,
} from './projectDetailViewport';

/** Default preview rows (unchanged from original behavior). */
export const ACCOUNTABILITY_PREVIEW_LIMIT = 6;

/** Tighter cap only on ~1920×1080 viewports. */
export const ACCOUNTABILITY_PREVIEW_LIMIT_1080P = 3;

/** Preview cap on ~2K (2560×1440) viewports. */
export const ACCOUNTABILITY_PREVIEW_LIMIT_2K = 4;

function subscribeMediaQuery(media: string, onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(media);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function matchesMedia(media: string): boolean {
  return window.matchMedia(media).matches;
}

export function useAccountabilityPreviewLimit(): number {
  const is1920x1080 = useSyncExternalStore(
    (onStoreChange) => subscribeMediaQuery(VIEWPORT_1920X1080_MEDIA, onStoreChange),
    () => matchesMedia(VIEWPORT_1920X1080_MEDIA),
    () => false
  );
  const is2k = useSyncExternalStore(
    (onStoreChange) => subscribeMediaQuery(VIEWPORT_2K_MEDIA, onStoreChange),
    () => matchesMedia(VIEWPORT_2K_MEDIA),
    () => false
  );

  if (is1920x1080) return ACCOUNTABILITY_PREVIEW_LIMIT_1080P;
  if (is2k) return ACCOUNTABILITY_PREVIEW_LIMIT_2K;
  return ACCOUNTABILITY_PREVIEW_LIMIT;
}
