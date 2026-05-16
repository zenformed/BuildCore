import { env } from '@/infrastructure/config/env';
import {
  parseAppConfigPatchOkJson,
  parseAppEntitlementWireResponse,
  parseHealthJson,
  parseProfileEnvelopeJson,
  parseRegisteredAppEnvelopeJson,
  parseSessionMeJson,
  parseStaffDeleteOkJson,
  parseStaffMemberEnvelopeJson,
  parseStaffMembersListEnvelopeJson,
  parseUserAppConfigEnvelopeJson,
} from '@/infrastructure/coreApi/parseResponse';
import type {
  CoreApiError,
  CoreApiResult,
  ZenformedCoreAppConfigPatchOk,
  ZenformedCoreAppEntitlementWireResponse,
  ZenformedCoreEntitlementAuthorityMode,
  ZenformedCoreHealthBody,
  ZenformedCoreProfileEnvelope,
  ZenformedCoreProfilePatchRequest,
  ZenformedCoreRegisteredAppEnvelope,
  ZenformedCoreSessionMeBody,
  ZenformedCoreStaffDeleteOk,
  ZenformedCoreStaffMemberEnvelope,
  ZenformedCoreStaffMemberRole,
  ZenformedCoreStaffMembersListEnvelope,
  ZenformedCoreUserAppConfigEnvelope,
} from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 5_000;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ ok: true; json: unknown } | { ok: false; error: CoreApiError }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
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
    return { ok: true, json };
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

async function fetchJsonWithBearer(
  url: string,
  accessToken: string,
  timeoutMs: number
): Promise<{ ok: true; json: unknown; status: number } | { ok: false; error: CoreApiError }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
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
    return { ok: true, json, status: res.status };
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

async function getFromCore<T>(
  path: string,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const url = `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
  const fetched = await fetchJsonWithTimeout(url, timeoutMs);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }
  const parsed = parse(fetched.json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

async function getFromCoreWithBearer<T>(
  path: string,
  accessToken: string,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const url = `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
  const fetched = await fetchJsonWithBearer(url, accessToken, timeoutMs);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }
  const parsed = parse(fetched.json);
  if (parsed == null) {
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

async function mutateFromCoreWithBearer<T>(
  path: string,
  accessToken: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  jsonBody: unknown | undefined,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) {
    return { ok: false, error: { kind: 'unconfigured' } };
  }
  const url = `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    const init: RequestInit = {
      method,
      signal: controller.signal,
      headers,
    };
    if (jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(jsonBody);
    }
    const res = await fetch(url, init);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'http_error', status: res.status, body: json } };
    }
    const parsed = parse(json);
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

async function patchFromCoreWithBearer<T>(
  path: string,
  accessToken: string,
  jsonBody: unknown,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  return mutateFromCoreWithBearer(path, accessToken, 'PATCH', jsonBody, parse, timeoutMs);
}

/** `GET /health` — optional; returns `unconfigured` when `ZENFORMED_CORE_API_URL` is unset. */
export async function getCoreHealth(): Promise<CoreApiResult<ZenformedCoreHealthBody>> {
  return getFromCore('/health', parseHealthJson);
}

/** `GET /apps/:appSlug` — registry metadata only; not authoritative for entitlements or auth. */
export async function getRegisteredApp(
  appSlug: string
): Promise<CoreApiResult<ZenformedCoreRegisteredAppEnvelope>> {
  const encoded = encodeURIComponent(appSlug);
  return getFromCore(`/apps/${encoded}`, parseRegisteredAppEnvelopeJson);
}

/** `GET /session/me` — requires Supabase access token; server-side / BFF only. */
export async function getSessionMe(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreSessionMeBody>> {
  return getFromCoreWithBearer('/session/me', accessToken, parseSessionMeJson);
}

/** `GET /users/me/profile` — sanitized profile DTO; server-side / BFF only. */
export async function getMyProfile(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreProfileEnvelope>> {
  return getFromCoreWithBearer('/users/me/profile', accessToken, parseProfileEnvelopeJson);
}

/** `PATCH /users/me/profile` — onboarding / password-reset flag updates; server-side / BFF only. */
export async function patchMyProfile(
  accessToken: string,
  body: ZenformedCoreProfilePatchRequest
): Promise<CoreApiResult<ZenformedCoreProfileEnvelope>> {
  return patchFromCoreWithBearer('/users/me/profile', accessToken, body, parseProfileEnvelopeJson);
}

/** `GET /users/me/app-config` — `data_source` + tier slice for SaaS app config; server-side only. */
export async function getMyAppConfig(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreUserAppConfigEnvelope>> {
  return getFromCoreWithBearer('/users/me/app-config', accessToken, parseUserAppConfigEnvelopeJson);
}

/** `PATCH /users/me/app-config` — updates `profiles.data_source` (validated); server-side only. */
export async function patchMyAppConfig(
  accessToken: string,
  body: { dataSource: 'excel' | 'database' }
): Promise<CoreApiResult<ZenformedCoreAppConfigPatchOk>> {
  return patchFromCoreWithBearer('/users/me/app-config', accessToken, body, parseAppConfigPatchOkJson);
}

export type GetAppEntitlementOptions = {
  authorityMode?: ZenformedCoreEntitlementAuthorityMode;
};

/** `GET /apps/:appSlug/entitlement` — legacy snapshot for the app; optional `authority_mode` for dual-read (server-side / BFF only). */
export async function getAppEntitlement(
  appSlug: string,
  accessToken: string,
  options?: GetAppEntitlementOptions
): Promise<CoreApiResult<ZenformedCoreAppEntitlementWireResponse>> {
  const encoded = encodeURIComponent(appSlug);
  let path = `/apps/${encoded}/entitlement`;
  const mode = options?.authorityMode;
  if (mode != null && mode !== 'legacy') {
    path += `?authority_mode=${encodeURIComponent(mode)}`;
  }
  return getFromCoreWithBearer(path, accessToken, parseAppEntitlementWireResponse);
}

/** `GET /users/me/staff-members` — list staff for the authenticated owner. */
export async function listStaffMembers(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreStaffMembersListEnvelope>> {
  return getFromCoreWithBearer('/users/me/staff-members', accessToken, parseStaffMembersListEnvelopeJson);
}

/** `GET /users/me/staff-members/:id` — single staff row if owned. */
export async function getStaffMember(
  accessToken: string,
  staffMemberId: string
): Promise<CoreApiResult<ZenformedCoreStaffMemberEnvelope>> {
  const encoded = encodeURIComponent(staffMemberId);
  return getFromCoreWithBearer(`/users/me/staff-members/${encoded}`, accessToken, parseStaffMemberEnvelopeJson);
}

/** `POST /users/me/staff-members` — create staff row (owner_id from JWT). */
export async function createStaffMember(
  accessToken: string,
  body: { name: string; role?: ZenformedCoreStaffMemberRole }
): Promise<CoreApiResult<ZenformedCoreStaffMemberEnvelope>> {
  return mutateFromCoreWithBearer(
    '/users/me/staff-members',
    accessToken,
    'POST',
    body,
    parseStaffMemberEnvelopeJson
  );
}

/** `PATCH /users/me/staff-members/:id` — partial update. */
export async function updateStaffMember(
  accessToken: string,
  staffMemberId: string,
  body: { name?: string; role?: ZenformedCoreStaffMemberRole }
): Promise<CoreApiResult<ZenformedCoreStaffMemberEnvelope>> {
  const encoded = encodeURIComponent(staffMemberId);
  return mutateFromCoreWithBearer(
    `/users/me/staff-members/${encoded}`,
    accessToken,
    'PATCH',
    body,
    parseStaffMemberEnvelopeJson
  );
}

/** `DELETE /users/me/staff-members/:id` — delete if owned. */
export async function deleteStaffMember(
  accessToken: string,
  staffMemberId: string
): Promise<CoreApiResult<ZenformedCoreStaffDeleteOk>> {
  const encoded = encodeURIComponent(staffMemberId);
  return mutateFromCoreWithBearer(
    `/users/me/staff-members/${encoded}`,
    accessToken,
    'DELETE',
    undefined,
    parseStaffDeleteOkJson
  );
}
