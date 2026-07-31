import type {
  CrmDuplicateCandidate,
  CrmDuplicateConfidence,
  CrmDuplicateMatchEvidence,
} from '@/domain/crm/identity';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';

const CONFIDENCE_RANK: Record<CrmDuplicateConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const MAX_VISIBLE_MATCH_EVIDENCE_COLUMNS = 3;

/** One match-evidence column (shared normalized value, different source field labels). */
export type DuplicateMatchEvidenceColumn = {
  readonly key: string;
  readonly displayValue: string;
  readonly incomingFieldLabel: string;
  readonly existingFieldLabel: string;
};

export function sortDuplicateReviewItemsForTable(
  items: readonly ImportDuplicateReviewItem[]
): ImportDuplicateReviewItem[] {
  return [...items].sort((a, b) => {
    const aBest = a.existingCandidates[0] ?? null;
    const bBest = b.existingCandidates[0] ?? null;
    const aConf = aBest
      ? CONFIDENCE_RANK[aBest.confidence]
      : a.peerIncoming.length > 0
        ? 1
        : 0;
    const bConf = bBest
      ? CONFIDENCE_RANK[bBest.confidence]
      : b.peerIncoming.length > 0
        ? 1
        : 0;
    if (bConf !== aConf) return bConf - aConf;

    const aEvidence = aBest?.evidence.length ?? 0;
    const bEvidence = bBest?.evidence.length ?? 0;
    if (bEvidence !== aEvidence) return bEvidence - aEvidence;

    return a.sourceRowIndex - b.sourceRowIndex;
  });
}

function sourceFieldLabel(
  sources: CrmDuplicateMatchEvidence['incomingSources'],
  fallback: string
): string {
  for (const source of sources) {
    const label = source.fieldLabel?.trim();
    if (label) return label;
  }
  return fallback;
}

function fallbackLabelForValueType(evidence: CrmDuplicateMatchEvidence): string {
  switch (evidence.valueType) {
    case 'email':
      return 'Email';
    case 'phone':
      return 'Phone';
    case 'name':
      return 'Name';
    case 'address':
      return 'Address';
    case 'identity_text':
      return 'Identity';
    default: {
      const _exhaustive: never = evidence.valueType;
      return _exhaustive;
    }
  }
}

function displayValueForEvidence(
  evidence: CrmDuplicateMatchEvidence,
  item: ImportDuplicateReviewItem,
  candidate: CrmDuplicateCandidate | null
): string {
  const record = candidate?.record;
  switch (evidence.valueType) {
    case 'email':
      return item.email?.trim() || record?.emails[0]?.trim() || evidence.normalizedValue;
    case 'phone':
      return item.phone?.trim() || record?.phones[0]?.trim() || evidence.normalizedValue;
    case 'name': {
      const incoming =
        item.contactName?.trim() || item.name.trim() || evidence.normalizedValue;
      return incoming;
    }
    case 'address':
      return (
        item.addressLine?.trim() ||
        record?.addressLine?.trim() ||
        evidence.normalizedValue
      );
    case 'identity_text':
      return evidence.normalizedValue;
    default: {
      const _exhaustive: never = evidence.valueType;
      return _exhaustive;
    }
  }
}

/**
 * Build up to 3 match-evidence columns explaining why this pair was flagged.
 * Extra evidence is reported via `hiddenCount` for a "+N more" control.
 */
export function buildMatchEvidenceColumns(input: {
  readonly item: ImportDuplicateReviewItem;
  readonly candidate: CrmDuplicateCandidate | null;
  readonly maxVisible?: number;
}): {
  readonly columns: readonly DuplicateMatchEvidenceColumn[];
  readonly hiddenCount: number;
} {
  const maxVisible = input.maxVisible ?? MAX_VISIBLE_MATCH_EVIDENCE_COLUMNS;
  const evidence = input.candidate?.evidence ?? [];
  const columns: DuplicateMatchEvidenceColumn[] = [];
  const seen = new Set<string>();

  for (const item of evidence) {
    const fallback = fallbackLabelForValueType(item);
    const key = `${item.valueType}:${item.normalizedValue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    columns.push({
      key,
      displayValue: displayValueForEvidence(item, input.item, input.candidate),
      incomingFieldLabel: sourceFieldLabel(item.incomingSources, fallback),
      existingFieldLabel: sourceFieldLabel(item.existingSources, fallback),
    });
  }

  return {
    columns: columns.slice(0, maxVisible),
    hiddenCount: Math.max(0, columns.length - maxVisible),
  };
}

export function reviewItemIdentifier(item: {
  readonly name: string;
  readonly contactName: string | null;
}): string {
  return item.contactName?.trim() || item.name.trim() || '—';
}

export function existingRecordProjectLabel(
  candidate: CrmDuplicateCandidate
): string {
  const { record } = candidate;
  if (record.recordType === 'subproject' && record.parentProjectName?.trim()) {
    return record.parentProjectName.trim();
  }
  return record.name.trim() || '—';
}
