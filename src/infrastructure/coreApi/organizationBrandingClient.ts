/**
 * ZenformedCore organization branding relay client (server-side / BFF only).
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult, ZenformedCoreOrganizationBranding } from '@/infrastructure/coreApi/types';
import { parseOrganizationBrandingJson } from '@/infrastructure/coreApi/parseResponse';

const DEFAULT_TIMEOUT_MS = 10_000;
const BRANDING_PATH = '/users/me/organization/branding';
const LOGO_PATH = '/users/me/organization/branding/logo';

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreUrl(path: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
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

async function parseBrandingJsonResponse(
  res: Response
): Promise<CoreApiResult<ZenformedCoreOrganizationBranding>> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  if (!res.ok) {
    return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
  }
  const parsed = parseOrganizationBrandingJson(json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

/** `GET /users/me/organization/branding` */
export async function getOrganizationBranding(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreOrganizationBranding>> {
  const url = coreUrl(BRANDING_PATH);
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(
    url,
    accessToken,
    { method: 'GET', headers: { Accept: 'application/json' } },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  return parseBrandingJsonResponse(res);
}

/** `PATCH /users/me/organization/branding` */
export async function patchOrganizationBrandingDisplayName(
  accessToken: string,
  displayName: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreOrganizationBranding>> {
  const url = coreUrl(BRANDING_PATH);
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(
    url,
    accessToken,
    {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  return parseBrandingJsonResponse(res);
}

/** `GET /users/me/organization/branding/logo` */
export async function getOrganizationLogoBytes(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<{ buffer: Buffer; contentType: string }>> {
  const url = coreUrl(LOGO_PATH);
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(url, accessToken, { method: 'GET' }, timeoutMs);
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  if (res.status === 404) {
    return { ok: false, error: { kind: 'http_error', status: 404 } };
  }
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    return { ok: false, error: { kind: 'http_error', status: res.status, body } };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
  return { ok: true, data: { buffer, contentType } };
}

/** `PUT /users/me/organization/branding/logo` */
export async function putOrganizationLogoRaw(
  accessToken: string,
  body: ArrayBuffer | Buffer,
  contentType: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreOrganizationBranding>> {
  const url = coreUrl(LOGO_PATH);
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(
    url,
    accessToken,
    {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': contentType },
      body: body instanceof Buffer ? new Uint8Array(body) : body,
    },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  return parseBrandingJsonResponse(res);
}

/** `DELETE /users/me/organization/branding/logo` */
export async function deleteOrganizationLogo(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreOrganizationBranding>> {
  const url = coreUrl(LOGO_PATH);
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(
    url,
    accessToken,
    { method: 'DELETE', headers: { Accept: 'application/json' } },
    timeoutMs
  );
  if ('error' in res) {
    return { ok: false, error: res.error };
  }
  return parseBrandingJsonResponse(res);
}
