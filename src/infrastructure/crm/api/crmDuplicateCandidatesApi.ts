import { crmApiPostJson } from '@/infrastructure/crm/api/crmApiClient';
import type {
  CrmDuplicateCandidate,
  CrmDuplicateCandidateGroup,
  CrmDuplicateConfidence,
  CrmDuplicateTruncationMeta,
} from '@/domain/crm/identity';
import { CRM_DUPLICATE_DETECTION_LIMITS } from '@/domain/crm/identity';
import {
  chunkArrayForImportDuplicateBatch,
  mergeImportDuplicateBatchMeta,
} from '@/domain/crm/importDuplicateDecisions';

export type CrmDuplicateCandidatesRequest = {
  readonly recordType?: 'project' | 'subproject';
  readonly projectName?: string | null;
  readonly contactName?: string | null;
  readonly emails?: readonly string[];
  readonly phones?: readonly string[];
  readonly address?: {
    readonly addressLine1: string | null;
    readonly addressLine2: string | null;
    readonly city: string | null;
    readonly state: string | null;
    readonly postalCode: string | null;
  };
  readonly nameParts?: {
    readonly firstName?: string | null;
    readonly lastName?: string | null;
    readonly fullName?: string | null;
  };
  readonly customFields?: readonly {
    readonly definitionId?: string;
    readonly valueId?: string | null;
    readonly fieldKey: string;
    readonly label: string;
    readonly valueText: string | null;
  }[];
  readonly excludeRecordId?: string | null;
  readonly maxCandidates?: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  /** When true, include soft-deleted/archived CRM records. Default false. */
  readonly includeArchived?: boolean;
  /** When true, include inactive (non-archived) CRM records. Default false. */
  readonly includeInactive?: boolean;
};

export type CrmDuplicateCandidatesResponse = {
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly meta: CrmDuplicateTruncationMeta;
};

export type CrmDuplicateCandidatesBatchItem = CrmDuplicateCandidatesRequest & {
  readonly incomingId: string;
};

export type CrmDuplicateCandidatesBatchRequest = {
  readonly items: readonly CrmDuplicateCandidatesBatchItem[];
  readonly excludeRecordIds?: readonly string[];
  readonly maxCandidatesPerIncoming?: number;
  readonly maxGroups?: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  readonly includeIncomingMatches?: boolean;
  /** When true, include soft-deleted/archived CRM records. Default false. */
  readonly includeArchived?: boolean;
  /** When true, include inactive (non-archived) CRM records. Default false. */
  readonly includeInactive?: boolean;
};

export type CrmDuplicateCandidatesBatchResponse = {
  readonly groups: readonly CrmDuplicateCandidateGroup[];
  readonly meta: CrmDuplicateTruncationMeta;
};

export async function fetchCrmDuplicateCandidates(
  request: CrmDuplicateCandidatesRequest
): Promise<CrmDuplicateCandidatesResponse> {
  return crmApiPostJson<CrmDuplicateCandidatesResponse>(
    '/api/crm/duplicates/candidates',
    request
  );
}

/**
 * Batch duplicate check with client-side chunking (≤200 rows per request).
 * Combines group arrays and merges truncation metadata across chunks.
 */
export async function fetchCrmDuplicateCandidatesBatch(
  request: CrmDuplicateCandidatesBatchRequest,
  chunkSize: number = CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows
): Promise<CrmDuplicateCandidatesBatchResponse> {
  const chunks = chunkArrayForImportDuplicateBatch(request.items, chunkSize);
  if (chunks.length === 0) {
    return {
      groups: [],
      meta: {
        truncated: false,
        returnedCandidateCount: 0,
        returnedGroupCount: 0,
        totalGroupCount: 0,
      },
    };
  }

  const groups: CrmDuplicateCandidateGroup[] = [];
  const metas: CrmDuplicateTruncationMeta[] = [];

  for (const chunk of chunks) {
    const response = await crmApiPostJson<CrmDuplicateCandidatesBatchResponse>(
      '/api/crm/duplicates/candidates/batch',
      {
        items: chunk,
        excludeRecordIds: request.excludeRecordIds,
        maxCandidatesPerIncoming: request.maxCandidatesPerIncoming,
        maxGroups: request.maxGroups,
        minConfidence: request.minConfidence,
        includeIncomingMatches: request.includeIncomingMatches,
        includeArchived: request.includeArchived,
        includeInactive: request.includeInactive,
      }
    );
    groups.push(...response.groups);
    metas.push(response.meta);
  }

  return {
    groups,
    meta: mergeImportDuplicateBatchMeta(metas),
  };
}
