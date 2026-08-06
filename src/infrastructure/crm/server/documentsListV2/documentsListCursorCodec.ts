/**
 * Signed opaque cursors for Documents list v2.
 * Reuses BUILDCORE_LIST_CURSOR_SECRET; typ/audience marker is BCDO (Documents).
 */

import { compactVerify, SignJWT } from 'jose';
import type {
  CrmDocumentsListV2CursorDirection,
  CrmDocumentsListV2NormalizedRequest,
} from '@/domain/crm/documentsListV2';

export const CRM_DOCUMENTS_LIST_V2_CURSOR_ERROR = 'invalid_cursor' as const;
export const CRM_DOCUMENTS_LIST_V2_CURSOR_TYP = 'BCDO' as const;
export const CRM_DOCUMENTS_LIST_V2_CURSOR_KID_DEFAULT = 'v1';
export const CRM_DOCUMENTS_LIST_V2_CURSOR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class CrmDocumentsListV2InvalidCursorError extends Error {
  readonly code = CRM_DOCUMENTS_LIST_V2_CURSOR_ERROR;

  constructor(message = 'Invalid list cursor') {
    super(message);
    this.name = 'CrmDocumentsListV2InvalidCursorError';
  }
}

export type CrmDocumentsListV2CursorPayload = {
  readonly v: 1;
  readonly kind: 'documents';
  readonly kid: string;
  readonly orgId: string;
  readonly projectId: string;
  readonly direction: CrmDocumentsListV2CursorDirection;
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
  const kid = env.BUILDCORE_LIST_CURSOR_KID?.trim() || CRM_DOCUMENTS_LIST_V2_CURSOR_KID_DEFAULT;
  return { kid, key: new TextEncoder().encode(secret) };
}

function assertCursorSecretsConfigured(
  material: CursorSecretMaterial | null
): CursorSecretMaterial {
  if (material == null) {
    throw new Error(
      'BUILDCORE_LIST_CURSOR_SECRET is required (min 32 chars) for Documents list v2 cursors'
    );
  }
  return material;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parsePayload(raw: unknown): CrmDocumentsListV2CursorPayload | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  if (raw.kind !== 'documents') return null;
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
    kind: 'documents',
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

export async function encodeCrmDocumentsListV2Cursor(input: {
  readonly organizationId: string;
  readonly request: CrmDocumentsListV2NormalizedRequest;
  readonly direction: CrmDocumentsListV2CursorDirection;
  readonly values: readonly unknown[];
  readonly id: string;
  readonly nowMs?: number;
  readonly env?: EnvMap;
}): Promise<string> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const nowMs = input.nowMs ?? Date.now();
  const payload: CrmDocumentsListV2CursorPayload = {
    v: 1,
    kind: 'documents',
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
      typ: CRM_DOCUMENTS_LIST_V2_CURSOR_TYP,
    })
    .sign(material.key);
}

export async function decodeCrmDocumentsListV2Cursor(input: {
  readonly cursor: string;
  readonly organizationId: string;
  readonly request: CrmDocumentsListV2NormalizedRequest;
  readonly nowMs?: number;
  readonly env?: EnvMap;
  readonly maxAgeMs?: number;
}): Promise<CrmDocumentsListV2CursorPayload> {
  const material = assertCursorSecretsConfigured(readCursorSecretMaterial(input.env));
  const token = input.cursor.trim();
  if (!token) throw new CrmDocumentsListV2InvalidCursorError();

  let payloadUnknown: unknown;
  try {
    const verified = await compactVerify(token, material.key, { algorithms: ['HS256'] });
    const typ =
      typeof verified.protectedHeader.typ === 'string' ? verified.protectedHeader.typ : null;
    if (typ != null && typ !== CRM_DOCUMENTS_LIST_V2_CURSOR_TYP) {
      throw new CrmDocumentsListV2InvalidCursorError();
    }
    const headerKid =
      typeof verified.protectedHeader.kid === 'string' ? verified.protectedHeader.kid : null;
    if (headerKid != null && headerKid !== material.kid) {
      throw new CrmDocumentsListV2InvalidCursorError();
    }
    payloadUnknown = JSON.parse(new TextDecoder().decode(verified.payload)) as unknown;
  } catch (err) {
    if (err instanceof CrmDocumentsListV2InvalidCursorError) throw err;
    throw new CrmDocumentsListV2InvalidCursorError();
  }

  const payload = parsePayload(payloadUnknown);
  if (payload == null) throw new CrmDocumentsListV2InvalidCursorError();

  const nowMs = input.nowMs ?? Date.now();
  const maxAge = input.maxAgeMs ?? CRM_DOCUMENTS_LIST_V2_CURSOR_MAX_AGE_MS;
  if (nowMs - payload.issuedAtMs > maxAge || payload.issuedAtMs > nowMs + 60_000) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  if (payload.orgId !== input.organizationId) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  if (payload.projectId !== input.request.projectId) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  if (payload.fingerprint !== input.request.fingerprint) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  if (payload.limit !== input.request.limit) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }

  return payload;
}

export function crmDocumentsListV2InvalidCursorResponse(): {
  readonly status: 400;
  readonly body: { readonly error: typeof CRM_DOCUMENTS_LIST_V2_CURSOR_ERROR };
} {
  return {
    status: 400,
    body: { error: CRM_DOCUMENTS_LIST_V2_CURSOR_ERROR },
  };
}

export function parseDocumentsCursorValues(payload: CrmDocumentsListV2CursorPayload): {
  readonly createdAt: string;
  readonly id: string;
} {
  const createdAt = payload.values[0];
  const id = payload.values[1];
  if (typeof createdAt !== 'string' || !createdAt.trim()) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  if (typeof id !== 'string' || !id.trim() || id !== payload.id) {
    throw new CrmDocumentsListV2InvalidCursorError();
  }
  return { createdAt, id };
}
