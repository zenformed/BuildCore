/**
 * Signed opaque cursors for Photos list v2.
 * Reuses BUILDCORE_LIST_CURSOR_SECRET; typ/audience marker is BCPO (Photos).
 */

import { compactVerify, SignJWT } from 'jose';
import type {
  CrmPhotosListV2CursorDirection,
  CrmPhotosListV2NormalizedRequest,
} from '@/domain/crm/photosListV2';

export const CRM_PHOTOS_LIST_V2_CURSOR_ERROR = 'invalid_cursor' as const;
export const CRM_PHOTOS_LIST_V2_CURSOR_TYP = 'BCPO' as const;
export const CRM_PHOTOS_LIST_V2_CURSOR_KID_DEFAULT = 'v1';
export const CRM_PHOTOS_LIST_V2_CURSOR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class CrmPhotosListV2InvalidCursorError extends Error {
  readonly code = CRM_PHOTOS_LIST_V2_CURSOR_ERROR;

  constructor(message = 'Invalid list cursor') {
    super(message);
    this.name = 'CrmPhotosListV2InvalidCursorError';
  }
}

export type CrmPhotosListV2CursorPayload = {
  readonly v: 1;
  readonly kind: 'photos';
  readonly kid: string;
  readonly orgId: string;
  readonly direction: CrmPhotosListV2CursorDirection;
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
  const kid = env.BUILDCORE_LIST_CURSOR_KID?.trim() || CRM_PHOTOS_LIST_V2_CURSOR_KID_DEFAULT;
  return { kid, key: new TextEncoder().encode(secret) };
}

function assertCursorSecretsConfigured(
  material: CursorSecretMaterial | null
): CursorSecretMaterial {
  if (material == null) {
    throw new Error(
      'BUILDCORE_LIST_CURSOR_SECRET is required (min 32 chars) for Photos list v2 cursors'
    );
  }
  return material;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parsePayload(raw: unknown): CrmPhotosListV2CursorPayload | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  if (raw.kind !== 'photos') return null;
  if (typeof raw.kid !== 'string' || !raw.kid.trim()) return null;
  if (typeof raw.orgId !== 'string' || !raw.orgId.trim()) return null;
  if (raw.direction !== 'forward') return null;
  if (typeof raw.fingerprint !== 'string' || !raw.fingerprint) return null;
  if (typeof raw.limit !== 'number' || !Number.isFinite(raw.limit)) return null;
  if (!Array.isArray(raw.values)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.issuedAtMs !== 'number' || !Number.isFinite(raw.issuedAtMs)) return null;
  return {
    v: 1,
    kind: 'photos',
    kid: raw.kid,
    orgId: raw.orgId,
    direction: 'forward',
    fingerprint: raw.fingerprint,
    limit: raw.limit,
    values: raw.values as readonly unknown[],
    id: raw.id,
    issuedAtMs: raw.issuedAtMs,
  };
}

export async function encodeCrmPhotosListV2Cursor(input: {
  readonly organizationId: string;
  readonly request: CrmPhotosListV2NormalizedRequest;
  readonly direction: CrmPhotosListV2CursorDirection;
  readonly values: readonly unknown[];
  readonly id: string;
  readonly nowMs?: number;
  readonly env?: EnvMap;
}): Promise<string> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const nowMs = input.nowMs ?? Date.now();
  const payload: CrmPhotosListV2CursorPayload = {
    v: 1,
    kind: 'photos',
    kid: material.kid,
    orgId: input.organizationId,
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
      typ: CRM_PHOTOS_LIST_V2_CURSOR_TYP,
    })
    .sign(material.key);
}

export async function decodeCrmPhotosListV2Cursor(input: {
  readonly cursor: string;
  readonly organizationId: string;
  readonly request: CrmPhotosListV2NormalizedRequest;
  readonly nowMs?: number;
  readonly env?: EnvMap;
  readonly maxAgeMs?: number;
}): Promise<CrmPhotosListV2CursorPayload> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const token = input.cursor.trim();
  if (!token) throw new CrmPhotosListV2InvalidCursorError();

  let payloadUnknown: unknown;
  try {
    const verified = await compactVerify(token, material.key, { algorithms: ['HS256'] });
    const typ =
      typeof verified.protectedHeader.typ === 'string' ? verified.protectedHeader.typ : null;
    if (typ != null && typ !== CRM_PHOTOS_LIST_V2_CURSOR_TYP) {
      throw new CrmPhotosListV2InvalidCursorError();
    }
    const headerKid =
      typeof verified.protectedHeader.kid === 'string' ? verified.protectedHeader.kid : null;
    if (headerKid != null && headerKid !== material.kid) {
      throw new CrmPhotosListV2InvalidCursorError();
    }
    payloadUnknown = JSON.parse(new TextDecoder().decode(verified.payload)) as unknown;
  } catch (err) {
    if (err instanceof CrmPhotosListV2InvalidCursorError) throw err;
    throw new CrmPhotosListV2InvalidCursorError();
  }

  const payload = parsePayload(payloadUnknown);
  if (payload == null) throw new CrmPhotosListV2InvalidCursorError();

  const nowMs = input.nowMs ?? Date.now();
  const maxAge = input.maxAgeMs ?? CRM_PHOTOS_LIST_V2_CURSOR_MAX_AGE_MS;
  if (nowMs - payload.issuedAtMs > maxAge || payload.issuedAtMs > nowMs + 60_000) {
    throw new CrmPhotosListV2InvalidCursorError();
  }
  if (payload.orgId !== input.organizationId) {
    throw new CrmPhotosListV2InvalidCursorError();
  }
  if (payload.fingerprint !== input.request.fingerprint) {
    throw new CrmPhotosListV2InvalidCursorError();
  }
  if (payload.limit !== input.request.limit) {
    throw new CrmPhotosListV2InvalidCursorError();
  }

  return payload;
}

export function crmPhotosListV2InvalidCursorResponse(): {
  readonly status: 400;
  readonly body: { readonly error: typeof CRM_PHOTOS_LIST_V2_CURSOR_ERROR };
} {
  return {
    status: 400,
    body: { error: CRM_PHOTOS_LIST_V2_CURSOR_ERROR },
  };
}

export function parsePhotosCursorValues(payload: CrmPhotosListV2CursorPayload): {
  readonly createdAt: string;
  readonly id: string;
} {
  const createdAt = payload.values[0];
  const id = payload.values[1];
  if (typeof createdAt !== 'string' || !createdAt.trim()) {
    throw new CrmPhotosListV2InvalidCursorError();
  }
  if (typeof id !== 'string' || !id.trim() || id !== payload.id) {
    throw new CrmPhotosListV2InvalidCursorError();
  }
  return { createdAt, id };
}
