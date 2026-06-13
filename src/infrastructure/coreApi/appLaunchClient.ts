import { env } from '@/infrastructure/config/env';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 5_000;
const BUILDCORE_LAUNCH_TARGET = 'buildcore';

export type AppLaunchExchangeResponse = {
  targetApp: typeof BUILDCORE_LAUNCH_TARGET;
  returnPath: string;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number | null;
  };
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function parseAppLaunchExchangeJson(json: unknown): AppLaunchExchangeResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.targetApp !== BUILDCORE_LAUNCH_TARGET) return null;
  if (typeof o.returnPath !== 'string') return null;
  if (o.session == null || typeof o.session !== 'object') return null;
  const session = o.session as Record<string, unknown>;
  if (typeof session.access_token !== 'string' || session.access_token.trim() === '') return null;
  if (typeof session.refresh_token !== 'string' || session.refresh_token.trim() === '') return null;
  const expiresAt =
    session.expires_at == null
      ? null
      : typeof session.expires_at === 'number'
        ? session.expires_at
        : null;
  return {
    targetApp: BUILDCORE_LAUNCH_TARGET,
    returnPath: o.returnPath,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: expiresAt,
    },
  };
}

/** `POST /auth/app-launch/exchange` — server-side BFF only; no user bearer. */
export async function exchangeAppLaunchCode(body: {
  code: string;
  targetApp: typeof BUILDCORE_LAUNCH_TARGET;
}): Promise<CoreApiResult<AppLaunchExchangeResponse>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const url = `${normalizeBaseUrl(base)}/auth/app-launch/exchange`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    const parsed = parseAppLaunchExchangeJson(json);
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

export const buildCoreLaunchTargetApp = BUILDCORE_LAUNCH_TARGET;
