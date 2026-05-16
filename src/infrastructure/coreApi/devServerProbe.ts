import { getRegisteredApp } from '@/infrastructure/coreApi/client';
import type { CoreApiError } from '@/infrastructure/coreApi/types';
import { BUILD_CORE_APP_SLUG } from '@/infrastructure/entitlements/buildCoreZenformedAppContext';
import { env } from '@/infrastructure/config/env';

/** Safe subset for logs — never include `http_error.body` (upstream payload may be verbose or sensitive). */
function summarizeCoreApiErrorForLog(error: CoreApiError): Record<string, unknown> {
  switch (error.kind) {
    case 'unconfigured':
      return { kind: 'unconfigured' };
    case 'timeout':
      return { kind: 'timeout' };
    case 'invalid_payload':
      return { kind: 'invalid_payload' };
    case 'http_error':
      return { kind: 'http_error', status: error.status };
    case 'network': {
      const m = error.message;
      const max = 200;
      if (m == null || m === '') return { kind: 'network' };
      return { kind: 'network', message: m.length <= max ? m : `${m.slice(0, max)}…` };
    }
  }
}

/**
 * Dev-only, server startup: one `console.debug` when Core URL is set (see `instrumentation.ts`).
 * Does not affect auth, gates, or Electron; failures are logged only, never thrown.
 * Slug matches `buildcoreAppDefinition.appSlug` / platform registry row for this product.
 */
export async function logZenformedCoreRegistryDevProbeOnce(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  if (env.zenformedCoreApiBaseUrl == null) return;

  const slug = BUILD_CORE_APP_SLUG;
  const result = await getRegisteredApp(slug);
  if (result.ok) {
    console.debug('[buildcore -> ZenformedCore]', 'GET /apps/' + slug, {
      appSlug: result.data.app.appSlug,
      displayName: result.data.app.displayName,
      status: result.data.app.status,
    });
    return;
  }
  console.debug('[buildcore -> ZenformedCore]', 'GET /apps/' + slug + ' unavailable', {
    error: summarizeCoreApiErrorForLog(result.error),
  });
}
