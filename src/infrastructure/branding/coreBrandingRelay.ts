import type { CoreApiError } from '@/infrastructure/coreApi/types';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';

export function coreBrandingHttpFailure(
  error: CoreApiError
): { status: number; body: Record<string, unknown> } | null {
  if (error.kind === 'http_error') {
    const st = error.status;
    if (st === 401 || st === 403) {
      return { status: 401, body: { error: 'unauthenticated' } };
    }
    if (st === 404) {
      const body = error.body;
      if (body != null && typeof body === 'object') {
        const o = body as Record<string, unknown>;
        if (o.error === 'organization_not_found') {
          return { status: 404, body: { error: 'organization_not_found' } };
        }
        if (o.error === 'logo_not_found') {
          return { status: 404, body: { error: 'logo_not_found' } };
        }
      }
      return { status: 404, body: { error: 'not_found' } };
    }
    if (st === 400 || st === 413) {
      return {
        status: st,
        body: {
          error: 'branding_rejected',
          detail: error.body,
        },
      };
    }
    const upstream = coreUpstreamHttpResponsePayload(error);
    if (upstream != null) {
      return { status: upstream.status, body: upstream.json };
    }
  }
  if (error.kind === 'unconfigured') {
    return { status: 503, body: { error: 'core_unconfigured' } };
  }
  return { status: 502, body: { error: 'branding_unavailable' } };
}
