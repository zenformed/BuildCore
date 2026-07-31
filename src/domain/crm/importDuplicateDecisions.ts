import { CRM_DUPLICATE_DETECTION_LIMITS } from '@/domain/crm/identity/duplicateCandidateTypes';
import type {
  CrmDuplicateCandidate,
  CrmDuplicateCandidateGroup,
  CrmDuplicateTruncationMeta,
  CrmDuplicateTruncationReason,
} from '@/domain/crm/identity';
import type { ImportMergeDecisionMap } from '@/domain/crm/importMergeReview';

/**
 * Stable id for an import row during duplicate review.
 * Uses sourceRowIndex (payload identity), never list position.
 */
export function importDuplicateIncomingId(sourceRowIndex: number): string {
  return `row:${sourceRowIndex}`;
}

export function parseImportDuplicateIncomingId(incomingId: string): number | null {
  if (!incomingId.startsWith('row:')) return null;
  const n = Number(incomingId.slice(4));
  return Number.isInteger(n) ? n : null;
}

/**
 * Same-customer validation for the duplicate review step.
 * Merge / replace / keep-both are decided on Merge Review, then applied on Start Import.
 *
 * - sameCustomer false → import as new
 * - sameCustomer true + keep_both → import as new
 * - sameCustomer true + merge_into / replace → update existing, skip create
 */
export type ImportDuplicateDecision = {
  readonly incomingId: string;
  /** true = Yes, same customer; false = No, different customer */
  readonly sameCustomer: boolean;
  readonly matchedRecordId?: string;
};

export type ImportDuplicateDecisionMap = Readonly<Record<string, ImportDuplicateDecision>>;

/** Snapshot persisted on the import job for audit / results. */
export type ImportDuplicateCheckSnapshot = {
  readonly decisions: readonly ImportDuplicateDecision[];
  readonly meta: CrmDuplicateTruncationMeta;
  readonly groupCount: number;
  readonly checkedAt: string;
};

export function areImportDuplicateDecisionsComplete(
  incomingIdsNeedingDecision: readonly string[],
  decisions: ImportDuplicateDecisionMap
): boolean {
  for (const id of incomingIdsNeedingDecision) {
    if (decisions[id] == null) return false;
  }
  return true;
}

/**
 * Rows confirmed as the same record are skipped on import when merging into
 * existing or replacing (after apply updates the existing record). Keep-both
 * still creates the imported row.
 */
export function skippedSourceRowIndexesFromDecisions(
  decisions: ImportDuplicateDecisionMap,
  mergeDecisions?: ImportMergeDecisionMap
): readonly number[] {
  const indexes: number[] = [];
  for (const decision of Object.values(decisions)) {
    if (!decision.sameCustomer) continue;
    const merge = mergeDecisions?.[decision.incomingId];
    if (merge?.recordAction === 'keep_both') {
      continue;
    }
    const index = parseImportDuplicateIncomingId(decision.incomingId);
    if (index != null) indexes.push(index);
  }
  return indexes.sort((a, b) => a - b);
}

/** Rows that will still be created after duplicate + merge decisions. */
export function countImportRowsToCreate(
  totalIncomingRows: number,
  decisions: ImportDuplicateDecisionMap,
  mergeDecisions?: ImportMergeDecisionMap
): number {
  const skipped = skippedSourceRowIndexesFromDecisions(decisions, mergeDecisions).length;
  return Math.max(0, totalIncomingRows - skipped);
}

export function summarizeImportDuplicateDecisions(input: {
  readonly totalIncomingRows: number;
  readonly groups: readonly CrmDuplicateCandidateGroup[];
  readonly decisions: ImportDuplicateDecisionMap;
  readonly meta: CrmDuplicateTruncationMeta | null;
}): {
  readonly totalIncomingRows: number;
  readonly rowsWithPossibleDuplicates: number;
  readonly sameCustomerCount: number;
  readonly differentCustomerCount: number;
  readonly existingMatchCount: number;
  readonly incomingToIncomingMatchCount: number;
  readonly truncated: boolean;
  readonly truncationMeta: CrmDuplicateTruncationMeta | null;
} {
  const needing = new Set<string>();
  let existingMatchCount = 0;
  let incomingToIncomingMatchCount = 0;

  for (const group of input.groups) {
    for (const id of group.incomingIds) needing.add(id);
    if (group.existingRecordIds.length > 0) {
      existingMatchCount += group.incomingIds.length;
    }
    if (group.incomingIds.length >= 2) {
      incomingToIncomingMatchCount += group.incomingIds.length;
    }
  }

  let sameCustomerCount = 0;
  let differentCustomerCount = 0;
  for (const id of needing) {
    const decision = input.decisions[id];
    if (decision == null) continue;
    if (decision.sameCustomer) sameCustomerCount += 1;
    else differentCustomerCount += 1;
  }

  return {
    totalIncomingRows: input.totalIncomingRows,
    rowsWithPossibleDuplicates: needing.size,
    sameCustomerCount,
    differentCustomerCount,
    existingMatchCount,
    incomingToIncomingMatchCount,
    truncated: input.meta?.truncated === true,
    truncationMeta: input.meta,
  };
}

export type ImportDuplicateReviewPeer = {
  readonly incomingId: string;
  readonly sourceRowIndex: number;
  readonly displayRowNumber: number;
  readonly name: string;
  readonly contactName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly addressLine: string | null;
};

export type ImportDuplicateReviewItem = {
  readonly incomingId: string;
  readonly sourceRowIndex: number;
  readonly displayRowNumber: number;
  readonly name: string;
  readonly contactName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly addressLine: string | null;
  readonly stage: string | null;
  readonly notes: string | null;
  readonly customFields: readonly {
    readonly fieldKey: string;
    readonly label: string;
    readonly valueText: string;
  }[];
  readonly existingCandidates: readonly CrmDuplicateCandidate[];
  readonly peerIncoming: readonly ImportDuplicateReviewPeer[];
};

export function buildImportDuplicateReviewItems(input: {
  readonly groups: readonly CrmDuplicateCandidateGroup[];
  readonly rowSummariesByIncomingId: ReadonlyMap<
    string,
    {
      readonly sourceRowIndex: number;
      readonly name: string;
      readonly contactName: string | null;
      readonly email: string | null;
      readonly phone: string | null;
      readonly emails?: readonly string[];
      readonly phones?: readonly string[];
      readonly addressLine: string | null;
      readonly stage?: string | null;
      readonly notes?: string | null;
      readonly customFields?: readonly {
        readonly fieldKey: string;
        readonly label: string;
        readonly valueText: string;
      }[];
    }
  >;
}): readonly ImportDuplicateReviewItem[] {
  const byIncoming = new Map<
    string,
    {
      existing: Map<string, CrmDuplicateCandidate>;
      peers: Set<string>;
    }
  >();

  for (const group of input.groups) {
    for (const incomingId of group.incomingIds) {
      let bucket = byIncoming.get(incomingId);
      if (bucket == null) {
        bucket = { existing: new Map(), peers: new Set() };
        byIncoming.set(incomingId, bucket);
      }
      for (const candidate of group.candidates) {
        const prev = bucket.existing.get(candidate.record.id);
        if (prev == null || candidate.score > prev.score) {
          bucket.existing.set(candidate.record.id, candidate);
        }
      }
      for (const peerId of group.incomingIds) {
        if (peerId !== incomingId) bucket.peers.add(peerId);
      }
    }
  }

  const items: ImportDuplicateReviewItem[] = [];
  for (const [incomingId, bucket] of byIncoming) {
    const summary = input.rowSummariesByIncomingId.get(incomingId);
    if (summary == null) continue;
    const existingCandidates = [...bucket.existing.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.record.id.localeCompare(b.record.id);
    });
    const peerIncoming: ImportDuplicateReviewPeer[] = [];
    for (const peerId of [...bucket.peers].sort((a, b) => a.localeCompare(b))) {
      const peer = input.rowSummariesByIncomingId.get(peerId);
      if (peer == null) continue;
      peerIncoming.push({
        incomingId: peerId,
        sourceRowIndex: peer.sourceRowIndex,
        displayRowNumber: peer.sourceRowIndex + 1,
        name: peer.name,
        contactName: peer.contactName,
        email: peer.email,
        phone: peer.phone,
        addressLine: peer.addressLine,
      });
    }
    if (existingCandidates.length === 0 && peerIncoming.length === 0) continue;
    items.push({
      incomingId,
      sourceRowIndex: summary.sourceRowIndex,
      displayRowNumber: summary.sourceRowIndex + 1,
      name: summary.name,
      contactName: summary.contactName,
      email: summary.email,
      phone: summary.phone,
      emails: summary.emails ?? (summary.email ? [summary.email] : []),
      phones: summary.phones ?? (summary.phone ? [summary.phone] : []),
      addressLine: summary.addressLine,
      stage: summary.stage ?? null,
      notes: summary.notes ?? null,
      customFields: summary.customFields ?? [],
      existingCandidates,
      peerIncoming,
    });
  }

  return items.sort((a, b) => a.sourceRowIndex - b.sourceRowIndex);
}

export function chunkArrayForImportDuplicateBatch<T>(
  items: readonly T[],
  chunkSize: number = CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows
): T[][] {
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function mergeImportDuplicateBatchMeta(
  metas: readonly CrmDuplicateTruncationMeta[]
): CrmDuplicateTruncationMeta {
  let truncated = false;
  let totalCandidateCount = 0;
  let returnedCandidateCount = 0;
  let totalGroupCount = 0;
  let returnedGroupCount = 0;
  let incomingRowCount = 0;
  let uniqueIdentityValueCount = 0;
  let searchedIdentityValueCount = 0;
  let matchingExistingRecordCount = 0;
  let searchedExistingRecordCount = 0;
  const reasons = new Set<CrmDuplicateTruncationReason>();

  for (const meta of metas) {
    if (meta.truncated) truncated = true;
    totalCandidateCount += meta.totalCandidateCount ?? 0;
    returnedCandidateCount += meta.returnedCandidateCount;
    totalGroupCount += meta.totalGroupCount ?? 0;
    returnedGroupCount += meta.returnedGroupCount ?? 0;
    incomingRowCount += meta.incomingRowCount ?? 0;
    uniqueIdentityValueCount += meta.uniqueIdentityValueCount ?? 0;
    searchedIdentityValueCount += meta.searchedIdentityValueCount ?? 0;
    // Summed across client batches — may over-count the same CRM record ID.
    matchingExistingRecordCount += meta.matchingExistingRecordCount ?? 0;
    searchedExistingRecordCount += meta.searchedExistingRecordCount ?? 0;
    for (const reason of meta.reasons ?? []) reasons.add(reason);
  }

  return {
    truncated,
    totalCandidateCount,
    returnedCandidateCount,
    totalGroupCount,
    returnedGroupCount,
    incomingRowCount,
    uniqueIdentityValueCount,
    searchedIdentityValueCount,
    matchingExistingRecordCount,
    searchedExistingRecordCount,
    reasons: reasons.size > 0 ? [...reasons] : undefined,
  };
}
