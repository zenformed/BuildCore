import { encodeCrmProjectsListV2FingerprintCanonical } from '../projectsListV2/fingerprint';
import {
  CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_PHOTOS_LIST_V2_PAGE_SIZES,
  CRM_PHOTOS_LIST_V2_SEARCH_MIN_LENGTH,
  type CrmPhotosListV2NormalizedRequest,
  type CrmPhotosListV2PageSize,
} from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type NormalizeCrmPhotosListV2RequestInput = {
  readonly organizationId?: unknown;
  readonly search?: unknown;
  readonly limit?: unknown;
};

export type NormalizeCrmPhotosListV2RequestResult =
  | { readonly ok: true; readonly request: CrmPhotosListV2NormalizedRequest }
  | { readonly ok: false; readonly error: 'invalid_request'; readonly message: string };

function normalizeLimit(raw: unknown): CrmPhotosListV2PageSize | { error: string } {
  if (raw == null || raw === '') return CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || !(CRM_PHOTOS_LIST_V2_PAGE_SIZES as readonly number[]).includes(n)) {
    return {
      error: `limit must be one of ${CRM_PHOTOS_LIST_V2_PAGE_SIZES.join(', ')}`,
    };
  }
  return n as CrmPhotosListV2PageSize;
}

function normalizeSearch(raw: unknown): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed.length === 0) return null;
  if (trimmed.length < CRM_PHOTOS_LIST_V2_SEARCH_MIN_LENGTH) return null;
  return trimmed;
}

export function buildCrmPhotosListV2Fingerprint(input: {
  readonly organizationId: string;
  readonly search: string | null;
  readonly limit: CrmPhotosListV2PageSize;
}): string {
  return encodeCrmProjectsListV2FingerprintCanonical(
    JSON.stringify({
      kind: 'photos',
      organizationId: input.organizationId,
      search: input.search,
      limit: input.limit,
    })
  );
}

export function normalizeCrmPhotosListV2Request(
  input: NormalizeCrmPhotosListV2RequestInput
): NormalizeCrmPhotosListV2RequestResult {
  if (typeof input.organizationId !== 'string' || !isUuid(input.organizationId.trim())) {
    return {
      ok: false,
      error: 'invalid_request',
      message: 'organizationId UUID is required',
    };
  }
  const organizationId = input.organizationId.trim().toLowerCase();
  const limitResult = normalizeLimit(input.limit);
  if (typeof limitResult === 'object') {
    return { ok: false, error: 'invalid_request', message: limitResult.error };
  }
  const search = normalizeSearch(input.search);
  const fingerprint = buildCrmPhotosListV2Fingerprint({
    organizationId,
    search,
    limit: limitResult,
  });
  return {
    ok: true,
    request: {
      organizationId,
      search,
      limit: limitResult,
      fingerprint,
    },
  };
}
