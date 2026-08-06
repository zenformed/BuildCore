import { encodeCrmProjectsListV2FingerprintCanonical } from '../projectsListV2/fingerprint';
import {
  CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_DOCUMENTS_LIST_V2_PAGE_SIZES,
  CRM_DOCUMENTS_LIST_V2_SEARCH_MIN_LENGTH,
  type CrmDocumentsListV2NormalizedRequest,
  type CrmDocumentsListV2PageSize,
} from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type NormalizeCrmDocumentsListV2RequestInput = {
  readonly projectId?: unknown;
  readonly search?: unknown;
  readonly limit?: unknown;
};

export type NormalizeCrmDocumentsListV2RequestResult =
  | { readonly ok: true; readonly request: CrmDocumentsListV2NormalizedRequest }
  | { readonly ok: false; readonly error: 'invalid_request'; readonly message: string };

function normalizeLimit(raw: unknown): CrmDocumentsListV2PageSize | { error: string } {
  if (raw == null || raw === '') return CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || !(CRM_DOCUMENTS_LIST_V2_PAGE_SIZES as readonly number[]).includes(n)) {
    return {
      error: `limit must be one of ${CRM_DOCUMENTS_LIST_V2_PAGE_SIZES.join(', ')}`,
    };
  }
  return n as CrmDocumentsListV2PageSize;
}

function normalizeSearch(raw: unknown): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (trimmed.length === 0) return null;
  if (trimmed.length < CRM_DOCUMENTS_LIST_V2_SEARCH_MIN_LENGTH) return null;
  return trimmed;
}

export function buildCrmDocumentsListV2Fingerprint(input: {
  readonly projectId: string;
  readonly search: string | null;
  readonly limit: CrmDocumentsListV2PageSize;
}): string {
  return encodeCrmProjectsListV2FingerprintCanonical(
    JSON.stringify({
      kind: 'documents',
      projectId: input.projectId,
      search: input.search,
      limit: input.limit,
    })
  );
}

export function normalizeCrmDocumentsListV2Request(
  input: NormalizeCrmDocumentsListV2RequestInput
): NormalizeCrmDocumentsListV2RequestResult {
  if (typeof input.projectId !== 'string' || !isUuid(input.projectId.trim())) {
    return {
      ok: false,
      error: 'invalid_request',
      message: 'projectId UUID is required',
    };
  }
  const projectId = input.projectId.trim().toLowerCase();
  const limitResult = normalizeLimit(input.limit);
  if (typeof limitResult === 'object') {
    return { ok: false, error: 'invalid_request', message: limitResult.error };
  }
  const search = normalizeSearch(input.search);
  const fingerprint = buildCrmDocumentsListV2Fingerprint({
    projectId,
    search,
    limit: limitResult,
  });
  return {
    ok: true,
    request: {
      projectId,
      search,
      limit: limitResult,
      fingerprint,
    },
  };
}
