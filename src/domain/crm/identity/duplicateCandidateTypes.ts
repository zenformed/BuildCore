import type { CrmIdentitySourceKind, CrmIdentityValueType } from './identityTypes';

export const CRM_DUPLICATE_CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type CrmDuplicateConfidence = (typeof CRM_DUPLICATE_CONFIDENCE_LEVELS)[number];

export type CrmDuplicateEvidenceSource = {
  readonly kind: string;
  readonly fieldKey: string | null;
  readonly fieldLabel: string | null;
};

export type CrmDuplicateMatchEvidence = {
  readonly valueType: CrmIdentityValueType;
  readonly normalizedValue: string;
  readonly incomingSources: readonly CrmDuplicateEvidenceSource[];
  readonly existingSources: readonly CrmDuplicateEvidenceSource[];
};

export type CrmDuplicateLifecycleStatus = 'active' | 'inactive' | 'archived';

export type CrmDuplicateCandidateCustomField = {
  readonly fieldKey: string;
  readonly label: string;
  readonly valueText: string;
};

export type CrmDuplicateCandidateRecordSummary = {
  readonly id: string;
  readonly slug: string;
  readonly recordType: 'project' | 'subproject';
  readonly name: string;
  readonly parentProjectId: string | null;
  readonly parentProjectSlug: string | null;
  readonly parentProjectName: string | null;
  readonly contactName: string | null;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly addressLine: string | null;
  readonly notes: string | null;
  readonly photoCount: number;
  readonly documentCount: number;
  readonly customFields: readonly CrmDuplicateCandidateCustomField[];
  readonly stageSlug: string;
  readonly stageLabel: string;
  readonly lifecycleStatus: CrmDuplicateLifecycleStatus;
  readonly subprojectStatus: string;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CrmDuplicateCandidate = {
  readonly record: CrmDuplicateCandidateRecordSummary;
  readonly confidence: CrmDuplicateConfidence;
  readonly score: number;
  readonly evidence: readonly CrmDuplicateMatchEvidence[];
};

export type CrmDuplicateCandidateGroupMember =
  | { readonly kind: 'incoming'; readonly incomingId: string }
  | { readonly kind: 'existing'; readonly recordId: string };

export type CrmDuplicateCandidateGroup = {
  readonly groupKey: string;
  readonly incomingIds: readonly string[];
  readonly existingRecordIds: readonly string[];
  readonly confidence: CrmDuplicateConfidence;
  readonly score: number;
  readonly evidence: readonly CrmDuplicateMatchEvidence[];
  readonly candidates: readonly CrmDuplicateCandidate[];
};

export const CRM_DUPLICATE_TRUNCATION_REASONS = [
  'max_unique_identity_values',
  'max_existing_records_per_query',
  'max_candidates_per_incoming',
  'max_groups',
  'existing_record_chunk_failed',
] as const;

export type CrmDuplicateTruncationReason = (typeof CRM_DUPLICATE_TRUNCATION_REASONS)[number];

export type CrmDuplicateTruncationMeta = {
  readonly truncated: boolean;
  readonly reasons?: readonly CrmDuplicateTruncationReason[];

  /** Incoming probe rows in this response (or sum across merged batches). */
  readonly incomingRowCount?: number;

  /** Unique incoming identity lookup keys before the unique-key cap. */
  readonly uniqueIdentityValueCount?: number;
  /** Lookup keys actually queried after the unique-key cap. */
  readonly searchedIdentityValueCount?: number;

  /**
   * Distinct existing record IDs returned by identity lookup before chunking.
   * When metas are merged across client 200-row batches, this is the **sum** of
   * per-batch counts (may over-count the same CRM record across batches).
   */
  readonly matchingExistingRecordCount?: number;
  /**
   * Existing records hydrated and scored.
   * After successful full chunk processing equals matchingExistingRecordCount
   * within a single batch request. Across merged batches, summed per-batch.
   */
  readonly searchedExistingRecordCount?: number;

  readonly totalCandidateCount?: number;
  readonly returnedCandidateCount: number;
  readonly totalGroupCount?: number;
  readonly returnedGroupCount?: number;
};

/** Centralized score weights — one contribution per distinct valueType in evidence. */
export const CRM_DUPLICATE_SCORE_WEIGHTS = {
  email: 100,
  phone: 100,
  name: 40,
  address: 35,
  identity_text: 15,
} as const satisfies Record<CrmIdentityValueType, number>;

/**
 * Minimum score to return a candidate at all.
 * Name-only (40) qualifies as low; lone identity_text (15) does not.
 */
export const CRM_DUPLICATE_MIN_SCORE_TO_RETURN = 40;

/**
 * Synchronous duplicate-detection safeguards.
 *
 * `maxExistingRecordsPerQuery` (1_000) is an **interim** bound on how many
 * existing CRM records are hydrated/scored **per chunk**. The batch service
 * pages through all matching record IDs in chunks of this size until complete
 * (or a chunk fails). It is not the final coverage architecture (no async job).
 */
export const CRM_DUPLICATE_DETECTION_LIMITS = {
  /** Max incoming probe rows per batch API request. */
  maxBatchRows: 200,
  /** Max unique (valueType, normalizedValue) pairs queried per request. */
  maxUniqueIdentityValues: 1_000,
  /** Max existing CRM candidates returned per incoming probe (after all chunks). */
  maxCandidatesPerIncoming: 10,
  /**
   * Max existing record IDs hydrated/scored per synchronous chunk.
   * Interim safeguard — chunked continuation processes all matching IDs.
   */
  maxExistingRecordsPerQuery: 1_000,
  /** Max evidence items kept per candidate or group. */
  maxEvidenceItems: 20,
  /** Chunk size for PostgREST `.in(normalized_value, …)` lookups. */
  identityValueInChunkSize: 80,
  /** Chunk size for loading existing project rows by id (PostgREST). */
  recordIdInChunkSize: 100,
} as const;

export function isCrmDuplicateConfidence(value: string): value is CrmDuplicateConfidence {
  return (CRM_DUPLICATE_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export function evidenceSourceKey(source: CrmDuplicateEvidenceSource): string {
  return `${source.kind}|${source.fieldKey ?? ''}|${source.fieldLabel ?? ''}`;
}

export function draftToEvidenceSource(draft: {
  readonly sourceKind: CrmIdentitySourceKind | string;
  readonly sourceFieldKey: string | null;
  readonly sourceFieldLabel: string | null;
}): CrmDuplicateEvidenceSource {
  return {
    kind: draft.sourceKind,
    fieldKey: draft.sourceFieldKey,
    fieldLabel: draft.sourceFieldLabel,
  };
}
