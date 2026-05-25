/**
 * ZenformedCore BuildCore role permissions relay.
 */

import { env } from '@/infrastructure/config/env';
import type { CoreApiError, CoreApiResult } from '@/infrastructure/coreApi/types';
import type {
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';

const DEFAULT_TIMEOUT_MS = 15_000;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function coreUrl(path: string): string | null {
  const base = env.zenformedCoreApiBaseUrl;
  if (base == null) return null;
  return `${normalizeBaseUrl(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseRolePermissionsResponse(json: unknown): BuildCoreRolePermissionsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.domain !== 'workflow_tasks') return null;
  if (!Array.isArray(o.rows) || !Array.isArray(o.editableRoleKeys)) return null;
  const flagKeys = [
    'canView',
    'canCreate',
    'canEdit',
    'canDelete',
    'canApprove',
    'canUpload',
  ] as const;
  const rows: BuildCoreRolePermissionRow[] = [];
  for (const rawRow of o.rows) {
    if (rawRow == null || typeof rawRow !== 'object') return null;
    const r = rawRow as Record<string, unknown>;
    if (r.roleKey !== 'admin' && r.roleKey !== 'coordinator' && r.roleKey !== 'member') {
      return null;
    }
    if (
      typeof r.canView !== 'boolean' ||
      typeof r.canCreate !== 'boolean' ||
      typeof r.canEdit !== 'boolean' ||
      typeof r.canDelete !== 'boolean' ||
      typeof r.canApprove !== 'boolean' ||
      typeof r.canUpload !== 'boolean'
    ) {
      return null;
    }
    rows.push({
      roleKey: r.roleKey,
      canView: r.canView,
      canCreate: r.canCreate,
      canEdit: r.canEdit,
      canDelete: r.canDelete,
      canApprove: r.canApprove,
      canUpload: r.canUpload,
    });
  }
  const editableRoleKeys = o.editableRoleKeys.filter(
    (k): k is BuildCorePermissionRoleKey =>
      k === 'admin' || k === 'coordinator' || k === 'member'
  );
  const actorRole = o.actorRole;
  if (
    actorRole !== 'owner' &&
    actorRole !== 'admin' &&
    actorRole !== 'coordinator' &&
    actorRole !== 'member'
  ) {
    return null;
  }
  return {
    domain: 'workflow_tasks',
    actorRole,
    editableRoleKeys,
    rows,
  };
}

function parseRolePermissionPatchResponse(json: unknown): { row: BuildCoreRolePermissionRow } | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.domain !== 'workflow_tasks' || o.row == null || typeof o.row !== 'object') return null;
  const full = parseRolePermissionsResponse({ ...o, rows: [o.row], editableRoleKeys: [], actorRole: 'owner' });
  if (full == null || full.rows.length !== 1) return null;
  return { row: full.rows[0] };
}

export function getBuildCoreRolePermissions(
  accessToken: string,
  domain: BuildCorePermissionDomain
): Promise<CoreApiResult<BuildCoreRolePermissionsResponse>> {
  const path = `/apps/buildcore/role-permissions?domain=${encodeURIComponent(domain)}`;
  const url = coreUrl(path);
  if (url == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  return fetch(url, {
    method: 'GET',
    signal: controller.signal,
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  })
    .then(async (res) => {
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return { ok: false as const, error: { kind: 'invalid_payload' as const } };
      }
      if (!res.ok) {
        return { ok: false as const, error: { kind: 'http_error' as const, status: res.status, body: json } };
      }
      const parsed = parseRolePermissionsResponse(json);
      if (parsed == null) {
        return { ok: false as const, error: { kind: 'invalid_payload' as const } };
      }
      return { ok: true as const, data: parsed };
    })
    .catch((e): CoreApiResult<BuildCoreRolePermissionsResponse> => {
      const aborted = e instanceof Error && e.name === 'AbortError';
      if (aborted) return { ok: false, error: { kind: 'timeout' } };
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: { kind: 'network', message } };
    })
    .finally(() => clearTimeout(timer));
}

export function patchBuildCoreRolePermission(
  accessToken: string,
  domain: BuildCorePermissionDomain,
  roleKey: BuildCorePermissionRoleKey,
  flags: BuildCoreRolePermissionFlags
): Promise<CoreApiResult<{ row: BuildCoreRolePermissionRow }>> {
  const path = `/apps/buildcore/role-permissions/${encodeURIComponent(roleKey)}?domain=${encodeURIComponent(domain)}`;
  const url = coreUrl(path);
  if (url == null) return Promise.resolve({ ok: false, error: { kind: 'unconfigured' } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  return fetch(url, {
    method: 'PATCH',
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flags),
  })
    .then(async (res) => {
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return { ok: false as const, error: { kind: 'invalid_payload' as const } };
      }
      if (!res.ok) {
        return { ok: false as const, error: { kind: 'http_error' as const, status: res.status, body: json } };
      }
      const parsed = parseRolePermissionPatchResponse(json);
      if (parsed == null) {
        return { ok: false as const, error: { kind: 'invalid_payload' as const } };
      }
      return { ok: true as const, data: parsed };
    })
    .catch((e): CoreApiResult<{ row: BuildCoreRolePermissionRow }> => {
      const aborted = e instanceof Error && e.name === 'AbortError';
      if (aborted) return { ok: false, error: { kind: 'timeout' } };
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: { kind: 'network', message } };
    })
    .finally(() => clearTimeout(timer));
}

export function buildCoreRolePermissionsErrorMessage(
  error: Extract<CoreApiResult<unknown>, { ok: false }>['error']
): string {
  if (error.kind === 'http_error' && error.body != null && typeof error.body === 'object') {
    const message = (error.body as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  if (error.kind === 'network' && error.message) return error.message;
  return 'Could not update permissions. Try again.';
}
