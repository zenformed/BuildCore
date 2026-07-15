/**
 * Server-only ZenformedCore notification create client (producer).
 * Separate from the browser consumer BFF adapter.
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 10_000;
const NO_STORE_FETCH: Pick<RequestInit, 'cache'> = { cache: 'no-store' };

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

export type CreatePlatformNotificationRequest = {
  readonly recipientUserId: string;
  readonly appSlug: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly destinationUrl: string;
  readonly actorUserId?: string | null;
  readonly entityType?: string | null;
  readonly entityId?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
};

export async function createPlatformNotificationOnCore(
  accessToken: string,
  organizationId: string,
  body: CreatePlatformNotificationRequest
): Promise<CoreApiResult<Record<string, unknown>>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const url = `${normalizeBaseUrl(base)}/organizations/${encodeURIComponent(organizationId)}/notifications`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...NO_STORE_FETCH,
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipientUserId: body.recipientUserId,
        appSlug: body.appSlug,
        type: body.type,
        notificationType: body.type,
        title: body.title,
        body: body.body,
        destinationUrl: body.destinationUrl,
        actorUserId: body.actorUserId ?? null,
        entityType: body.entityType ?? null,
        entityId: body.entityId ?? null,
        metadata: body.metadata ?? {},
        idempotencyKey: body.idempotencyKey,
      }),
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
