import type { CoreApiError } from '@/infrastructure/coreApi/types';

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
