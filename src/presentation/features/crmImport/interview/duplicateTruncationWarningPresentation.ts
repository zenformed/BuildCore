/**
 * Reason-aware duplicate truncation warning presentation for import review UI.
 */

import type {
  CrmDuplicateTruncationMeta,
  CrmDuplicateTruncationReason,
} from '@/domain/crm/identity';

export type DuplicateTruncationWarningCopy = {
  readonly existingRecordsPartial: (
    searched: number,
    matching: number
  ) => string;
  readonly identityValuesPartial: (searched: number, total: number) => string;
  readonly multipleLimitsSummary: string;
  readonly viewDetails: string;
  readonly detailIdentityValues: (searched: number, total: number) => string;
  readonly detailExistingRecords: (searched: number, matching: number) => string;
  readonly detailCandidates: (returned: number, total: number) => string;
  readonly detailGroups: (returned: number, total: number) => string;
  readonly chunkFailed: string;
  readonly candidatesCapped: (returned: number, total: number) => string;
  readonly groupsCapped: (returned: number, total: number) => string;
  readonly genericPartial: string;
};

export type DuplicateTruncationWarningModel = {
  readonly summary: string;
  readonly details: readonly string[] | null;
  readonly hasMultipleReasons: boolean;
};

function reasonSet(
  meta: CrmDuplicateTruncationMeta
): ReadonlySet<CrmDuplicateTruncationReason> {
  return new Set(meta.reasons ?? []);
}

export function buildDuplicateTruncationWarningModel(
  meta: CrmDuplicateTruncationMeta | null | undefined,
  copy: DuplicateTruncationWarningCopy
): DuplicateTruncationWarningModel | null {
  if (meta == null || !meta.truncated) return null;

  const reasons = reasonSet(meta);
  const searchedExisting = meta.searchedExistingRecordCount ?? 0;
  const matchingExisting = meta.matchingExistingRecordCount ?? 0;
  const searchedIdentity = meta.searchedIdentityValueCount ?? 0;
  const uniqueIdentity = meta.uniqueIdentityValueCount ?? 0;
  const returnedCandidates = meta.returnedCandidateCount ?? 0;
  const totalCandidates = meta.totalCandidateCount ?? returnedCandidates;
  const returnedGroups = meta.returnedGroupCount ?? 0;
  const totalGroups = meta.totalGroupCount ?? returnedGroups;

  const details: string[] = [
    copy.detailIdentityValues(searchedIdentity, uniqueIdentity),
    copy.detailExistingRecords(searchedExisting, matchingExisting),
    copy.detailCandidates(returnedCandidates, totalCandidates),
    copy.detailGroups(returnedGroups, totalGroups),
  ];

  if (reasons.size > 1) {
    return {
      summary: copy.multipleLimitsSummary,
      details,
      hasMultipleReasons: true,
    };
  }

  if (reasons.has('max_existing_records_per_query')) {
    return {
      summary: copy.existingRecordsPartial(searchedExisting, matchingExisting),
      details: null,
      hasMultipleReasons: false,
    };
  }

  if (reasons.has('max_unique_identity_values')) {
    return {
      summary: copy.identityValuesPartial(searchedIdentity, uniqueIdentity),
      details: null,
      hasMultipleReasons: false,
    };
  }

  if (reasons.has('existing_record_chunk_failed')) {
    return {
      summary: copy.chunkFailed,
      details,
      hasMultipleReasons: false,
    };
  }

  if (reasons.has('max_candidates_per_incoming')) {
    return {
      summary: copy.candidatesCapped(returnedCandidates, totalCandidates),
      details: null,
      hasMultipleReasons: false,
    };
  }

  if (reasons.has('max_groups')) {
    return {
      summary: copy.groupsCapped(returnedGroups, totalGroups),
      details: null,
      hasMultipleReasons: false,
    };
  }

  return {
    summary: copy.genericPartial,
    details,
    hasMultipleReasons: false,
  };
}
