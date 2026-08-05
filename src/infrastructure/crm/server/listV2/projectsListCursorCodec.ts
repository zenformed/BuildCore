/**
 * Signed opaque cursors for CRM Projects/Subprojects list v2.
 * Uses JWS HS256 (jose) with BUILDCORE_LIST_CURSOR_SECRET — never anon/service keys.
 */

import { compactVerify, SignJWT } from 'jose';
import type {
  CrmProjectsListV2CursorDirection,
  CrmProjectsListV2CursorPayload,
  CrmProjectsListV2NormalizedRequest,
  CrmProjectsListV2SortMode,
  CrmProjectsListV2View,
} from '@/domain/crm/projectsListV2';
import { CRM_PROJECTS_LIST_V2_SORT_MODES, CRM_PROJECTS_LIST_V2_VIEWS } from '@/domain/crm/projectsListV2';

export const CRM_PROJECTS_LIST_V2_CURSOR_ERROR = 'invalid_cursor' as const;

export class CrmProjectsListV2InvalidCursorError extends Error {
  readonly code = CRM_PROJECTS_LIST_V2_CURSOR_ERROR;

  constructor(message = 'Invalid list cursor') {
    super(message);
    this.name = 'CrmProjectsListV2InvalidCursorError';
  }
}

/** Default key id for HMAC rotation. */
export const CRM_PROJECTS_LIST_V2_CURSOR_KID_DEFAULT = 'v1';

/** Cursor max age (7 days). Expired cursors are rejected. */
export const CRM_PROJECTS_LIST_V2_CURSOR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CursorSecretMaterial = {
  readonly kid: string;
  readonly key: Uint8Array;
};

type EnvMap = Readonly<Record<string, string | undefined>>;

function readCursorSecretMaterial(env: EnvMap = process.env): CursorSecretMaterial | null {
  const secret = env.BUILDCORE_LIST_CURSOR_SECRET?.trim() ?? '';
  if (secret.length < 32) return null;
  const kid = env.BUILDCORE_LIST_CURSOR_KID?.trim() || CRM_PROJECTS_LIST_V2_CURSOR_KID_DEFAULT;
  return { kid, key: new TextEncoder().encode(secret) };
}

function assertCursorSecretsConfigured(material: CursorSecretMaterial | null): CursorSecretMaterial {
  if (material == null) {
    throw new Error(
      'BUILDCORE_LIST_CURSOR_SECRET is required (min 32 chars) for Projects list v2 cursors'
    );
  }
  return material;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parsePayload(raw: unknown): CrmProjectsListV2CursorPayload | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  if (typeof raw.kid !== 'string' || !raw.kid.trim()) return null;
  if (typeof raw.orgId !== 'string' || !raw.orgId.trim()) return null;
  if (typeof raw.view !== 'string' || !(CRM_PROJECTS_LIST_V2_VIEWS as readonly string[]).includes(raw.view)) {
    return null;
  }
  if (
    !(
      raw.parentProjectId === null ||
      (typeof raw.parentProjectId === 'string' && raw.parentProjectId.length > 0)
    )
  ) {
    return null;
  }
  if (typeof raw.sort !== 'string' || !(CRM_PROJECTS_LIST_V2_SORT_MODES as readonly string[]).includes(raw.sort)) {
    return null;
  }
  if (raw.direction !== 'forward' && raw.direction !== 'backward') return null;
  if (typeof raw.fingerprint !== 'string' || !raw.fingerprint) return null;
  if (!Array.isArray(raw.values)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.issuedAtMs !== 'number' || !Number.isFinite(raw.issuedAtMs)) return null;

  return {
    v: 1,
    kid: raw.kid,
    orgId: raw.orgId,
    view: raw.view as CrmProjectsListV2View,
    parentProjectId: raw.parentProjectId as string | null,
    sort: raw.sort as CrmProjectsListV2SortMode,
    direction: raw.direction as CrmProjectsListV2CursorDirection,
    fingerprint: raw.fingerprint,
    values: raw.values as readonly unknown[],
    id: raw.id,
    issuedAtMs: raw.issuedAtMs,
  };
}

export type EncodeCrmProjectsListV2CursorInput = {
  readonly organizationId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly direction: CrmProjectsListV2CursorDirection;
  /** Operational sort: [bucket, lastActivityAtIso|null, id] — id must match `id`. */
  readonly values: readonly unknown[];
  readonly id: string;
  readonly nowMs?: number;
  readonly env?: EnvMap;
};

export async function encodeCrmProjectsListV2Cursor(
  input: EncodeCrmProjectsListV2CursorInput
): Promise<string> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const nowMs = input.nowMs ?? Date.now();
  const payload: CrmProjectsListV2CursorPayload = {
    v: 1,
    kid: material.kid,
    orgId: input.organizationId,
    view: input.request.view,
    parentProjectId: input.request.parentProjectId,
    sort: input.request.sort,
    direction: input.direction,
    fingerprint: input.request.fingerprint,
    values: input.values,
    id: input.id,
    issuedAtMs: nowMs,
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', kid: material.kid, typ: 'BCPL' })
    .sign(material.key);
}

export type DecodeCrmProjectsListV2CursorInput = {
  readonly cursor: string;
  readonly organizationId: string;
  readonly request: CrmProjectsListV2NormalizedRequest;
  readonly nowMs?: number;
  readonly env?: EnvMap;
  /** Override max age for tests. */
  readonly maxAgeMs?: number;
};

/**
 * Verifies signature (constant-time via jose) and binds org/view/parent/sort/fingerprint.
 * Throws {@link CrmProjectsListV2InvalidCursorError} without leaking payload contents.
 */
export async function decodeCrmProjectsListV2Cursor(
  input: DecodeCrmProjectsListV2CursorInput
): Promise<CrmProjectsListV2CursorPayload> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const token = input.cursor.trim();
  if (!token) {
    throw new CrmProjectsListV2InvalidCursorError();
  }

  let payloadUnknown: unknown;
  try {
    const verified = await compactVerify(token, material.key, {
      algorithms: ['HS256'],
    });
    const headerKid =
      typeof verified.protectedHeader.kid === 'string' ? verified.protectedHeader.kid : null;
    if (headerKid != null && headerKid !== material.kid) {
      // Future multi-key rotation can look up by kid; Phase 0 accepts only active kid.
      throw new CrmProjectsListV2InvalidCursorError();
    }
    payloadUnknown = JSON.parse(new TextDecoder().decode(verified.payload)) as unknown;
  } catch (err) {
    if (err instanceof CrmProjectsListV2InvalidCursorError) throw err;
    throw new CrmProjectsListV2InvalidCursorError();
  }

  const payload = parsePayload(payloadUnknown);
  if (payload == null) {
    throw new CrmProjectsListV2InvalidCursorError();
  }

  const nowMs = input.nowMs ?? Date.now();
  const maxAge = input.maxAgeMs ?? CRM_PROJECTS_LIST_V2_CURSOR_MAX_AGE_MS;
  if (nowMs - payload.issuedAtMs > maxAge || payload.issuedAtMs > nowMs + 60_000) {
    throw new CrmProjectsListV2InvalidCursorError();
  }

  if (payload.orgId !== input.organizationId) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (payload.view !== input.request.view) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (payload.parentProjectId !== input.request.parentProjectId) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (payload.sort !== input.request.sort) {
    throw new CrmProjectsListV2InvalidCursorError();
  }
  if (payload.fingerprint !== input.request.fingerprint) {
    throw new CrmProjectsListV2InvalidCursorError();
  }

  return payload;
}

export function crmProjectsListV2InvalidCursorResponse(): {
  readonly status: 400;
  readonly body: { readonly error: typeof CRM_PROJECTS_LIST_V2_CURSOR_ERROR };
} {
  return {
    status: 400,
    body: { error: CRM_PROJECTS_LIST_V2_CURSOR_ERROR },
  };
}
