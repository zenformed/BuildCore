/**
 * ZenformedCore organization workspace relay (members, invites, seats, app access).
 */

import { env } from '@/infrastructure/config/env';
import {
  parseOrganizationAppAccessJson,
  parseOrganizationAssignmentIdentitiesJson,
  parseOrganizationInviteAcceptJson,
  parseOrganizationInviteLookupJson,
  parseOrganizationInviteMutationJson,
  parseOrganizationInvitesJson,
  parseOrganizationMembershipContextJson,
  parseOrganizationMemberRoleUpdateJson,
  parseOrganizationMemberProfileUpdateJson,
  parseOrganizationMemberRemoveJson,
  parseOrganizationMembersJson,
  parseOrganizationSeatsJson,
} from '@/infrastructure/coreApi/parseResponse';
import type {
  CoreApiError,
  CoreApiResult,
  ZenformedCoreOrganizationAppAccessResponse,
  ZenformedCoreOrganizationAssignmentIdentitiesResponse,
  ZenformedCoreOrganizationInviteAcceptRequest,
  ZenformedCoreOrganizationInviteAcceptResponse,
  ZenformedCoreOrganizationInviteCreateRequest,
  ZenformedCoreOrganizationInviteLookupResponse,
  ZenformedCoreOrganizationInviteMutationResponse,
  ZenformedCoreOrganizationInvitesResponse,
  ZenformedCoreOrganizationMembershipContextResponse,
  ZenformedCoreOrganizationMemberRoleUpdateRequest,
  ZenformedCoreOrganizationMemberRoleUpdateResponse,
  ZenformedCoreOrganizationMemberProfileUpdateRequest,
  ZenformedCoreOrganizationMemberProfileUpdateResponse,
  ZenformedCoreOrganizationMemberRemoveResponse,
  ZenformedCoreOrganizationMembersResponse,
  ZenformedCoreOrganizationSeatsResponse,
} from '@/infrastructure/coreApi/types';

const DEFAULT_TIMEOUT_MS = 10_000;

/** Next.js caches server `fetch` GETs by default in production unless opted out. */
const NO_STORE_FETCH: Pick<RequestInit, 'cache'> = { cache: 'no-store' };

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
  timeoutMs: number
): Promise<Response | { error: CoreApiError }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...NO_STORE_FETCH,
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(
  path: string,
  accessToken: string,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const url = coreUrl(path);
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };
  const res = await fetchWithBearer(url, accessToken, timeoutMs);
  if ('error' in res) return { ok: false, error: res.error };
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
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[organizationWorkspaceClient] Core payload rejected by parser', path, json);
    }
    return { ok: false, error: { kind: 'invalid_payload' } };
  }
  return { ok: true, data: parsed };
}

async function mutateJson<T>(
  path: string,
  accessToken: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown | undefined,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const url = coreUrl(path);
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    const init: RequestInit = { ...NO_STORE_FETCH, method, signal: controller.signal, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
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
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[organizationWorkspaceClient] Core payload rejected by parser', path, json);
      }
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

export function getOrganizationMembers(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationMembersResponse>> {
  return getJson('/organizations/me/members', accessToken, parseOrganizationMembersJson);
}

export function getOrganizationMembershipContext(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationMembershipContextResponse>> {
  return getJson(
    '/organizations/me/membership-context',
    accessToken,
    parseOrganizationMembershipContextJson
  );
}

export function getOrganizationInvites(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationInvitesResponse>> {
  return getJson('/organizations/me/invites', accessToken, parseOrganizationInvitesJson);
}

export function getOrganizationSeats(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationSeatsResponse>> {
  return getJson('/organizations/me/seats', accessToken, parseOrganizationSeatsJson);
}

export function getOrganizationAppAccess(
  accessToken: string
): Promise<CoreApiResult<ZenformedCoreOrganizationAppAccessResponse>> {
  return getJson('/organizations/me/app-access', accessToken, parseOrganizationAppAccessJson);
}

export function getOrganizationAssignmentIdentities(
  accessToken: string,
  appSlug = 'buildcore'
): Promise<CoreApiResult<ZenformedCoreOrganizationAssignmentIdentitiesResponse>> {
  const query = new URLSearchParams({ appSlug });
  return getJson(
    `/organizations/me/assignment-identities?${query.toString()}`,
    accessToken,
    parseOrganizationAssignmentIdentitiesJson
  );
}

export function postOrganizationInvite(
  accessToken: string,
  body: ZenformedCoreOrganizationInviteCreateRequest
): Promise<CoreApiResult<ZenformedCoreOrganizationInviteMutationResponse>> {
  return mutateJson(
    '/organizations/me/invites',
    accessToken,
    'POST',
    body,
    parseOrganizationInviteMutationJson
  );
}

export function cancelOrganizationInvite(
  accessToken: string,
  inviteId: string
): Promise<CoreApiResult<ZenformedCoreOrganizationInviteMutationResponse>> {
  return mutateJson(
    `/organizations/me/invites/${encodeURIComponent(inviteId)}/cancel`,
    accessToken,
    'PATCH',
    undefined,
    parseOrganizationInviteMutationJson
  );
}

export function patchOrganizationMemberRole(
  accessToken: string,
  memberId: string,
  body: ZenformedCoreOrganizationMemberRoleUpdateRequest
): Promise<CoreApiResult<ZenformedCoreOrganizationMemberRoleUpdateResponse>> {
  return mutateJson(
    `/organizations/me/members/${encodeURIComponent(memberId)}/role`,
    accessToken,
    'PATCH',
    body,
    parseOrganizationMemberRoleUpdateJson
  );
}

export function deleteOrganizationMember(
  accessToken: string,
  memberId: string
): Promise<CoreApiResult<ZenformedCoreOrganizationMemberRemoveResponse>> {
  return mutateJson(
    `/organizations/me/members/${encodeURIComponent(memberId)}`,
    accessToken,
    'DELETE',
    undefined,
    parseOrganizationMemberRemoveJson
  );
}

export function patchOrganizationMemberProfile(
  accessToken: string,
  memberId: string,
  body: ZenformedCoreOrganizationMemberProfileUpdateRequest
): Promise<CoreApiResult<ZenformedCoreOrganizationMemberProfileUpdateResponse>> {
  return mutateJson(
    `/organizations/me/members/${encodeURIComponent(memberId)}`,
    accessToken,
    'PATCH',
    body,
    parseOrganizationMemberProfileUpdateJson
  );
}

async function getPublicJson<T>(
  path: string,
  parse: (json: unknown) => T | null,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CoreApiResult<T>> {
  const url = coreUrl(path);
  if (url == null) return { ok: false, error: { kind: 'unconfigured' } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...NO_STORE_FETCH,
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
    const parsed = parse(json);
    if (parsed == null) {
      return { ok: false, error: { kind: 'invalid_payload' } };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    if (aborted) return { ok: false, error: { kind: 'timeout' } };
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: 'network', message } };
  } finally {
    clearTimeout(timer);
  }
}

export function lookupOrganizationInvite(
  token: string
): Promise<CoreApiResult<ZenformedCoreOrganizationInviteLookupResponse>> {
  const query = new URLSearchParams({ token });
  return getPublicJson(
    `/organizations/invites/lookup?${query.toString()}`,
    parseOrganizationInviteLookupJson
  );
}

export function acceptOrganizationInvite(
  accessToken: string,
  body: ZenformedCoreOrganizationInviteAcceptRequest
): Promise<CoreApiResult<ZenformedCoreOrganizationInviteAcceptResponse>> {
  return mutateJson(
    '/organizations/invites/accept',
    accessToken,
    'POST',
    body,
    parseOrganizationInviteAcceptJson
  );
}
