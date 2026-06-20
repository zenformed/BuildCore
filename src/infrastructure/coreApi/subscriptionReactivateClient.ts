import { env } from '@/infrastructure/config/env';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 15_000;

export type ReactivateSubscriptionResponse = {
  productSlug: string;
  entitlement: unknown;
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function parseReactivateSubscriptionJson(json: unknown): ReactivateSubscriptionResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.productSlug !== 'string' || o.productSlug.trim() === '') return null;
  if (o.entitlement == null || typeof o.entitlement !== 'object') return null;
  return { productSlug: o.productSlug.trim().toLowerCase(), entitlement: o.entitlement };
}

/** POST /billing/subscriptions/:productSlug/reactivate — undo cancel-at-period-end. */
export async function reactivateSubscriptionOnCore(
  accessToken: string,
  productSlug: string
): Promise<CoreApiResult<ReactivateSubscriptionResponse>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }

  const slug = productSlug.trim().toLowerCase();
  const url = `${normalizeBaseUrl(base)}/billing/subscriptions/${encodeURIComponent(slug)}/reactivate`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productSlug: slug }),
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

    const parsed = parseReactivateSubscriptionJson(json);
    if (parsed == null) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) {
      return { ok: false, error: { kind: 'timeout' } };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}
