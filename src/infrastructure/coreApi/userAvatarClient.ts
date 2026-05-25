/**
 * ZenformedCore user avatar relay client (server-side / BFF only).
 * `GET|PUT|DELETE /users/me/avatar`, `GET /users/me/avatar/meta`
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult, ZenformedCoreUserAvatarMeta } from '@/infrastructure/coreApi/types';
import { parseUserAvatarMetaJson } from '@/infrastructure/coreApi/parseResponse';

const DEFAULT_TIMEOUT_MS = 10_000;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreAvatarUrl(path: string): string | null {
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

/** `GET /users/me/avatar/meta` */
export async function getMyAvatarMeta(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreUserAvatarMeta>> {
  const url = coreAvatarUrl('/users/me/avatar/meta');
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(url, accessToken, { method: 'GET', headers: { Accept: 'application/json' } }, timeoutMs);
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
    return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
  }
  const parsed = parseUserAvatarMetaJson(json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

/** `GET /organizations/me/member-avatar?userId=...` — org member image bytes (viewer must share org). */
export async function getOrganizationMemberAvatarBytes(
  accessToken: string,
  userId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<{ buffer: Buffer; contentType: string }>> {
  const query = new URLSearchParams({ userId });
  const url = coreAvatarUrl(`/organizations/me/member-avatar?${query.toString()}`);
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

/** `GET /users/me/avatar` — image bytes. */
export async function getMyAvatarBytes(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<{ buffer: Buffer; contentType: string }>> {
  const url = coreAvatarUrl('/users/me/avatar');
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

/** `PUT /users/me/avatar` — raw or multipart body forwarded as-is. */
export async function putMyAvatarRaw(
  accessToken: string,
  body: ArrayBuffer | Buffer,
  contentType: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreUserAvatarMeta>> {
  const url = coreAvatarUrl('/users/me/avatar');
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(
    url,
    accessToken,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': contentType,
      },
      body: body instanceof Buffer ? new Uint8Array(body) : body,
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
    return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
  }
  const parsed = parseUserAvatarMetaJson(json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

/** `DELETE /users/me/avatar` */
export async function deleteMyAvatar(
  accessToken: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<ZenformedCoreUserAvatarMeta>> {
  const url = coreAvatarUrl('/users/me/avatar');
  if (url == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const res = await fetchWithBearer(url, accessToken, { method: 'DELETE', headers: { Accept: 'application/json' } }, timeoutMs);
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
    return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
  }
  const parsed = parseUserAvatarMetaJson(json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}
