/**
 * ZenformedCore consumer notification relays (BuildCore server → Core).
 * Organization id is provided by the BFF from trusted membership context.
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 10_000;
const NO_STORE_FETCH: Pick<RequestInit, 'cache'> = { cache: 'no-store' };

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreNotificationsBase(organizationId: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}/organizations/${encodeURIComponent(organizationId)}/notifications`;
}

async function requestCoreJson(
  url: string,
  accessToken: string,
  init: RequestInit
): Promise<CoreApiResult<Record<string, unknown>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...NO_STORE_FETCH,
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
    }
    if (json == null || typeof json !== 'object' || Array.isArray(json)) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: json as Record<string, unknown> };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

function asRecordResult(
  result: CoreApiResult<Record<string, unknown>>
): CoreApiResult<Record<string, unknown>> {
  return result;
}

export function getCoreNotificationsLatest(
  accessToken: string,
  organizationId: string,
  query: { limit?: string | null }
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = coreNotificationsBase(organizationId);
  if (base == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', query.limit);
  const qs = params.toString();
  return requestCoreJson(`${base}/latest${qs ? `?${qs}` : ''}`, accessToken, { method: 'GET' }).then(
    asRecordResult
  );
}

export function getCoreNotificationsPage(
  accessToken: string,
  organizationId: string,
  query: { limit?: string | null; cursor?: string | null }
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = coreNotificationsBase(organizationId);
  if (base == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', query.limit);
  if (query.cursor) params.set('cursor', query.cursor);
  const qs = params.toString();
  return requestCoreJson(`${base}${qs ? `?${qs}` : ''}`, accessToken, { method: 'GET' }).then(
    asRecordResult
  );
}

export function getCoreNotificationsUnreadCount(
  accessToken: string,
  organizationId: string
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = coreNotificationsBase(organizationId);
  if (base == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });
  return requestCoreJson(`${base}/unread-count`, accessToken, { method: 'GET' }).then(asRecordResult);
}

export function postCoreNotificationMarkRead(
  accessToken: string,
  organizationId: string,
  notificationId: string
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = coreNotificationsBase(organizationId);
  if (base == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });
  return requestCoreJson(`${base}/${encodeURIComponent(notificationId)}/read`, accessToken, {
    method: 'POST',
    body: '{}',
  }).then(asRecordResult);
}

export function postCoreNotificationsMarkAllRead(
  accessToken: string,
  organizationId: string
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = coreNotificationsBase(organizationId);
  if (base == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });
  return requestCoreJson(`${base}/read-all`, accessToken, {
    method: 'POST',
    body: '{}',
  }).then(asRecordResult);
}

export type { CoreApiError };
