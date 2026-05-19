/**
 * ZenformedCore app-scoped document storage gateway (server / BFF only).
 */

import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 60_000;
const APP_SLUG = buildcoreAppDefinition.appSlug;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreStorageUrl(
  organizationId: string,
  pathSuffix: string,
  query?: Record<string, string>
): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  const url = new URL(
    `${normalizeBaseUrl(base)}/apps/${encodeURIComponent(APP_SLUG)}/orgs/${encodeURIComponent(organizationId)}/storage/${pathSuffix}`
  );
  if (query != null) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function fetchWithBearer(
  url: string,
  accessToken: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response | { error: CoreApiError }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return await fetch(url, { ...init, signal: controller.signal, headers });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) {
      return { error: { kind: 'timeout' } };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpError(res: Response, json: unknown): CoreApiError {
  return { kind: 'http_error', status: res.status, body: json };
}

export async function putAppDocumentObject(
  accessToken: string,
  organizationId: string,
  input: { bucket: string; storageKey: string; mimeType: string; body: Uint8Array },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<void>> {
  const url = coreStorageUrl(organizationId, 'objects', {
    bucket: input.bucket,
    key: input.storageKey,
  });
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const res = await fetchWithBearer(
    url,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': input.mimeType || 'application/octet-stream' },
      body: input.body,
    },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  let json: unknown = null;
  try {
    if (res.headers.get('content-type')?.includes('application/json')) {
      json = await res.json();
    }
  } catch {
    json = null;
  }
  if (!res.ok) {
    return { ok: false, error: mapHttpError(res, json) };
  }
  return { ok: true, data: undefined };
}

export async function deleteAppDocumentObject(
  accessToken: string,
  organizationId: string,
  input: { bucket: string; storageKey: string },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<void>> {
  const url = coreStorageUrl(organizationId, 'objects', {
    bucket: input.bucket,
    key: input.storageKey,
  });
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const res = await fetchWithBearer(url, accessToken, { method: 'DELETE' }, timeoutMs);
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  let json: unknown = null;
  try {
    if (res.headers.get('content-type')?.includes('application/json')) {
      json = await res.json();
    }
  } catch {
    json = null;
  }
  if (!res.ok) {
    return { ok: false, error: mapHttpError(res, json) };
  }
  return { ok: true, data: undefined };
}

export async function createAppDocumentSignedDownloadUrl(
  accessToken: string,
  organizationId: string,
  input: { bucket: string; storageKey: string; expiresInSeconds?: number },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<{ url: string; expiresInSeconds: number }>> {
  const url = coreStorageUrl(organizationId, 'signed-download-url');
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const res = await fetchWithBearer(
    url,
    accessToken,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: input.bucket,
        storageKey: input.storageKey,
        expiresInSeconds: input.expiresInSeconds,
      }),
    },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  if (!res.ok) {
    return { ok: false, error: mapHttpError(res, json) };
  }
  const record = json as { url?: string; expiresInSeconds?: number };
  if (typeof record.url !== 'string' || record.url.trim() === '') {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return {
    ok: true,
    data: {
      url: record.url,
      expiresInSeconds:
        typeof record.expiresInSeconds === 'number' ? record.expiresInSeconds : 3600,
    },
  };
}
