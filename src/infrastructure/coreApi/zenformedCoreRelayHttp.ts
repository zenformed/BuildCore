import type { CoreApiError } from '@/infrastructure/coreApi/types';

/** Prevent CDN/proxy/browser caching of organization workspace BFF responses. */
export const ORGANIZATION_WORKSPACE_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

/**
 * When ZenformedCore returns HTTP 5xx, surface the same status on the Forge BFF so local dev
 * does not see a generic 502 for upstream misconfiguration (e.g. Core **503** when Core’s Supabase env is incomplete).
 */
export function coreUpstreamHttpResponsePayload(
  error: CoreApiError
): { status: number; json: Record<string, unknown> } | null {
  if (error.kind !== 'http_error') return null;
  const st = error.status;
  if (st < 500 || st > 599) return null;
  return {
    status: st,
    json: {
      relay: 'zenformed_core',
      error: 'zenformed_core_upstream',
      upstreamStatus: st,
      upstreamBody: error.body,
    },
  };
}
