'use client';

import { useSyncExternalStore } from 'react';

export const DASHBOARD_MOBILE_BREAKPOINT_PX = 768;

const MOBILE_MEDIA_QUERY = `(max-width: ${DASHBOARD_MOBILE_BREAKPOINT_PX - 1}px)`;

function subscribeMobileLayout(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getMobileLayoutSnapshot(): boolean {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

/** True when the dashboard should render the mobile card list (phones only). */
export function useDashboardMobileLayout(): boolean {
  return useSyncExternalStore(subscribeMobileLayout, getMobileLayoutSnapshot, () => false);
}
