/**
 * Signed opaque cursors for Accountability list v2.
 * Reuses BUILDCORE_LIST_CURSOR_SECRET; typ/audience marker is BCAL (Accountability).
 */

import { compactVerify, SignJWT } from 'jose';
import type {
  CrmAccountabilityListV2CursorDirection,
  CrmAccountabilityListV2NormalizedRequest,
} from '@/domain/crm/accountabilityListV2';

export const CRM_ACCOUNTABILITY_LIST_V2_CURSOR_ERROR = 'invalid_cursor' as const;
export const CRM_ACCOUNTABILITY_LIST_V2_CURSOR_TYP = 'BCAL' as const;
export const CRM_ACCOUNTABILITY_LIST_V2_CURSOR_KID_DEFAULT = 'v1';
export const CRM_ACCOUNTABILITY_LIST_V2_CURSOR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class CrmAccountabilityListV2InvalidCursorError extends Error {
  readonly code = CRM_ACCOUNTABILITY_LIST_V2_CURSOR_ERROR;

  constructor(message = 'Invalid list cursor') {
    super(message);
    this.name = 'CrmAccountabilityListV2InvalidCursorError';
  }
}

export type CrmAccountabilityListV2CursorPayload = {
  readonly v: 1;
  readonly kind: 'accountability';
  readonly kid: string;
  readonly orgId: string;
  readonly projectId: string;
  readonly direction: CrmAccountabilityListV2CursorDirection;
  readonly fingerprint: string;
  readonly limit: number;
  /** [createdAtIso, id] */
  readonly values: readonly unknown[];
  readonly id: string;
  readonly issuedAtMs: number;
};

type EnvMap = Readonly<Record<string, string | undefined>>;

type CursorSecretMaterial = {
  readonly kid: string;
  readonly key: Uint8Array;
};

function readCursorSecretMaterial(env: EnvMap = process.env): CursorSecretMaterial | null {
  const secret = env.BUILDCORE_LIST_CURSOR_SECRET?.trim() ?? '';
  if (secret.length < 32) return null;
  const kid =
    env.BUILDCORE_LIST_CURSOR_KID?.trim() || CRM_ACCOUNTABILITY_LIST_V2_CURSOR_KID_DEFAULT;
  return { kid, key: new TextEncoder().encode(secret) };
}

function assertCursorSecretsConfigured(
  material: CursorSecretMaterial | null
): CursorSecretMaterial {
  if (material == null) {
    throw new Error(
      'BUILDCORE_LIST_CURSOR_SECRET is required (min 32 chars) for Accountability list v2 cursors'
    );
  }
  return material;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parsePayload(raw: unknown): CrmAccountabilityListV2CursorPayload | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  if (raw.kind !== 'accountability') return null;
  if (typeof raw.kid !== 'string' || !raw.kid.trim()) return null;
  if (typeof raw.orgId !== 'string' || !raw.orgId.trim()) return null;
  if (typeof raw.projectId !== 'string' || !raw.projectId.trim()) return null;
  if (raw.direction !== 'forward') return null;
  if (typeof raw.fingerprint !== 'string' || !raw.fingerprint) return null;
  if (typeof raw.limit !== 'number' || !Number.isFinite(raw.limit)) return null;
  if (!Array.isArray(raw.values)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.issuedAtMs !== 'number' || !Number.isFinite(raw.issuedAtMs)) return null;
  return {
    v: 1,
    kind: 'accountability',
    kid: raw.kid,
    orgId: raw.orgId,
    projectId: raw.projectId,
    direction: 'forward',
    fingerprint: raw.fingerprint,
    limit: raw.limit,
    values: raw.values as readonly unknown[],
    id: raw.id,
    issuedAtMs: raw.issuedAtMs,
  };
}

export async function encodeCrmAccountabilityListV2Cursor(input: {
  readonly organizationId: string;
  readonly request: CrmAccountabilityListV2NormalizedRequest;
  readonly direction: CrmAccountabilityListV2CursorDirection;
  readonly values: readonly unknown[];
  readonly id: string;
  readonly nowMs?: number;
  readonly env?: EnvMap;
}): Promise<string> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const nowMs = input.nowMs ?? Date.now();
  const payload: CrmAccountabilityListV2CursorPayload = {
    v: 1,
    kind: 'accountability',
    kid: material.kid,
    orgId: input.organizationId,
    projectId: input.request.projectId,
    direction: input.direction,
    fingerprint: input.request.fingerprint,
    limit: input.request.limit,
    values: input.values,
    id: input.id,
    issuedAtMs: nowMs,
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({
      alg: 'HS256',
      kid: material.kid,
      typ: CRM_ACCOUNTABILITY_LIST_V2_CURSOR_TYP,
    })
    .sign(material.key);
}

export async function decodeCrmAccountabilityListV2Cursor(input: {
  readonly cursor: string;
  readonly organizationId: string;
  readonly request: CrmAccountabilityListV2NormalizedRequest;
  readonly nowMs?: number;
  readonly env?: EnvMap;
  readonly maxAgeMs?: number;
}): Promise<CrmAccountabilityListV2CursorPayload> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const token = input.cursor.trim();
  if (!token) throw new CrmAccountabilityListV2InvalidCursorError();

  let payloadUnknown: unknown;
  try {
    const verified = await compactVerify(token, material.key, { algorithms: ['HS256'] });
    const typ =
      typeof verified.protectedHeader.typ === 'string' ? verified.protectedHeader.typ : null;
    if (typ != null && typ !== CRM_ACCOUNTABILITY_LIST_V2_CURSOR_TYP) {
      throw new CrmAccountabilityListV2InvalidCursorError();
    }
    const headerKid =
      typeof verified.protectedHeader.kid === 'string' ? verified.protectedHeader.kid : null;
    if (headerKid != null && headerKid !== material.kid) {
      throw new CrmAccountabilityListV2InvalidCursorError();
    }
    payloadUnknown = JSON.parse(new TextDecoder().decode(verified.payload)) as unknown;
  } catch (err) {
    if (err instanceof CrmAccountabilityListV2InvalidCursorError) throw err;
    throw new CrmAccountabilityListV2InvalidCursorError();
  }

  const payload = parsePayload(payloadUnknown);
  if (payload == null) throw new CrmAccountabilityListV2InvalidCursorError();

  const nowMs = input.nowMs ?? Date.now();
  const maxAge = input.maxAgeMs ?? CRM_ACCOUNTABILITY_LIST_V2_CURSOR_MAX_AGE_MS;
  if (nowMs - payload.issuedAtMs > maxAge || payload.issuedAtMs > nowMs + 60_000) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  if (payload.orgId !== input.organizationId) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  if (payload.projectId !== input.request.projectId) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  if (payload.fingerprint !== input.request.fingerprint) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  if (payload.limit !== input.request.limit) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }

  return payload;
}

export function crmAccountabilityListV2InvalidCursorResponse(): {
  readonly status: 400;
  readonly body: { readonly error: typeof CRM_ACCOUNTABILITY_LIST_V2_CURSOR_ERROR };
} {
  return {
    status: 400,
    body: { error: CRM_ACCOUNTABILITY_LIST_V2_CURSOR_ERROR },
  };
}

export function parseAccountabilityCursorValues(payload: CrmAccountabilityListV2CursorPayload): {
  readonly createdAt: string;
  readonly id: string;
} {
  const createdAt = payload.values[0];
  const id = payload.values[1];
  if (typeof createdAt !== 'string' || !createdAt.trim()) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  if (typeof id !== 'string' || !id.trim() || id !== payload.id) {
    throw new CrmAccountabilityListV2InvalidCursorError();
  }
  return { createdAt, id };
}
