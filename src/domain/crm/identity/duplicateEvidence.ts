import type { CrmIdentityValueDraft, CrmIdentityValueType } from './identityTypes';
import {
  draftToEvidenceSource,
  evidenceSourceKey,
  type CrmDuplicateEvidenceSource,
  type CrmDuplicateMatchEvidence,
} from './duplicateCandidateTypes';

export function identityLookupKey(
  valueType: CrmIdentityValueType,
  normalizedValue: string
): string {
  return `${valueType}:${normalizedValue}`;
}

function mergeSources(
  sources: readonly CrmDuplicateEvidenceSource[]
): CrmDuplicateEvidenceSource[] {
  const byKey = new Map<string, CrmDuplicateEvidenceSource>();
  for (const source of sources) {
    const key = evidenceSourceKey(source);
    if (!byKey.has(key)) byKey.set(key, source);
  }
  return [...byKey.values()].sort((a, b) => evidenceSourceKey(a).localeCompare(evidenceSourceKey(b)));
}

/**
 * Build evidence for one (valueType, normalizedValue) match between left and right drafts/rows.
 */
export function buildMatchEvidenceItem(input: {
  readonly valueType: CrmIdentityValueType;
  readonly normalizedValue: string;
  readonly incomingSources: readonly CrmDuplicateEvidenceSource[];
  readonly existingSources: readonly CrmDuplicateEvidenceSource[];
}): CrmDuplicateMatchEvidence {
  return {
    valueType: input.valueType,
    normalizedValue: input.normalizedValue,
    incomingSources: mergeSources(input.incomingSources),
    existingSources: mergeSources(input.existingSources),
  };
}

export function evidenceFromDraftPair(
  valueType: CrmIdentityValueType,
  normalizedValue: string,
  incomingDrafts: readonly CrmIdentityValueDraft[],
  existingDrafts: readonly CrmIdentityValueDraft[]
): CrmDuplicateMatchEvidence {
  return buildMatchEvidenceItem({
    valueType,
    normalizedValue,
    incomingSources: incomingDrafts.map(draftToEvidenceSource),
    existingSources: existingDrafts.map(draftToEvidenceSource),
  });
}

/** Merge evidence lists by (valueType, normalizedValue), unioning sources. */
export function mergeDuplicateEvidence(
  items: readonly CrmDuplicateMatchEvidence[]
): CrmDuplicateMatchEvidence[] {
  const byKey = new Map<string, CrmDuplicateMatchEvidence>();
  for (const item of items) {
    const key = identityLookupKey(item.valueType, item.normalizedValue);
    const existing = byKey.get(key);
    if (existing == null) {
      byKey.set(key, {
        valueType: item.valueType,
        normalizedValue: item.normalizedValue,
        incomingSources: mergeSources(item.incomingSources),
        existingSources: mergeSources(item.existingSources),
      });
      continue;
    }
    byKey.set(key, {
      valueType: item.valueType,
      normalizedValue: item.normalizedValue,
      incomingSources: mergeSources([...existing.incomingSources, ...item.incomingSources]),
      existingSources: mergeSources([...existing.existingSources, ...item.existingSources]),
    });
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.valueType !== b.valueType) return a.valueType.localeCompare(b.valueType);
    return a.normalizedValue.localeCompare(b.normalizedValue);
  });
}

export function capEvidence(
  items: readonly CrmDuplicateMatchEvidence[],
  maxItems: number
): { readonly evidence: readonly CrmDuplicateMatchEvidence[]; readonly truncated: boolean } {
  if (items.length <= maxItems) {
    return { evidence: items, truncated: false };
  }
  return { evidence: items.slice(0, maxItems), truncated: true };
}

/** Union-find for connected duplicate groups. */
export class DuplicateUnionFind {
  private readonly parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    this.add(id);
    const parent = this.parent.get(id)!;
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    // Deterministic: lexicographically smaller root wins
    if (rootA < rootB) this.parent.set(rootB, rootA);
    else this.parent.set(rootA, rootB);
  }

  groups(): Map<string, string[]> {
    const byRoot = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const list = byRoot.get(root) ?? [];
      list.push(id);
      byRoot.set(root, list);
    }
    for (const list of byRoot.values()) {
      list.sort((a, b) => a.localeCompare(b));
    }
    return byRoot;
  }
}

export function incomingNodeId(incomingId: string): string {
  return `incoming:${incomingId}`;
}

export function existingNodeId(recordId: string): string {
  return `existing:${recordId}`;
}

export function parseGroupNodeId(
  nodeId: string
): { kind: 'incoming'; id: string } | { kind: 'existing'; id: string } | null {
  if (nodeId.startsWith('incoming:')) {
    return { kind: 'incoming', id: nodeId.slice('incoming:'.length) };
  }
  if (nodeId.startsWith('existing:')) {
    return { kind: 'existing', id: nodeId.slice('existing:'.length) };
  }
  return null;
}
