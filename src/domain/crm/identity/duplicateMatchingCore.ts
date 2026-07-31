import type { CrmIdentityValueDraft, CrmIdentityValueType } from './identityTypes';
import {
  CRM_DUPLICATE_DETECTION_LIMITS,
  draftToEvidenceSource,
  type CrmDuplicateCandidate,
  type CrmDuplicateCandidateGroup,
  type CrmDuplicateCandidateRecordSummary,
  type CrmDuplicateConfidence,
  type CrmDuplicateMatchEvidence,
} from './duplicateCandidateTypes';
import {
  classifyDuplicateConfidence,
  compareDuplicateCandidates,
  isDuplicateCandidateLifecycleIncluded,
  scoreDuplicateEvidence,
  shouldReturnDuplicateCandidate,
} from './duplicateConfidence';
import {
  buildMatchEvidenceItem,
  capEvidence,
  DuplicateUnionFind,
  existingNodeId,
  identityLookupKey,
  incomingNodeId,
  mergeDuplicateEvidence,
  parseGroupNodeId,
} from './duplicateEvidence';

function asSource(draft: CrmIdentityValueDraft) {
  return draftToEvidenceSource(draft);
}

export type CrmDuplicateProbeDrafts = {
  readonly incomingId: string;
  readonly drafts: readonly CrmIdentityValueDraft[];
};

export type CrmDuplicateIdentityHit = {
  readonly recordId: string;
  readonly valueType: CrmIdentityValueType;
  readonly normalizedValue: string;
  readonly sourceKind: string;
  readonly sourceFieldKey: string | null;
  readonly sourceFieldLabel: string | null;
};

type EdgeEvidence = {
  readonly leftId: string;
  readonly rightId: string;
  readonly evidence: readonly CrmDuplicateMatchEvidence[];
};

function indexDraftsByLookup(
  drafts: readonly CrmIdentityValueDraft[]
): Map<string, CrmIdentityValueDraft[]> {
  const map = new Map<string, CrmIdentityValueDraft[]>();
  for (const draft of drafts) {
    const key = identityLookupKey(draft.valueType, draft.normalizedValue);
    const list = map.get(key) ?? [];
    list.push(draft);
    map.set(key, list);
  }
  return map;
}

function collectUniqueLookupKeys(
  probes: readonly CrmDuplicateProbeDrafts[]
): string[] {
  const keys = new Set<string>();
  for (const probe of probes) {
    for (const draft of probe.drafts) {
      keys.add(identityLookupKey(draft.valueType, draft.normalizedValue));
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function parseIdentityLookupKey(
  key: string
): { valueType: CrmIdentityValueType; normalizedValue: string } | null {
  const idx = key.indexOf(':');
  if (idx <= 0) return null;
  const valueType = key.slice(0, idx) as CrmIdentityValueType;
  const normalizedValue = key.slice(idx + 1);
  if (!normalizedValue) return null;
  return { valueType, normalizedValue };
}

/**
 * Pure incoming↔existing matching for one probe against prefetched identity hits.
 */
export function matchProbeAgainstIdentityHits(input: {
  readonly probe: CrmDuplicateProbeDrafts;
  readonly hits: readonly CrmDuplicateIdentityHit[];
  readonly recordsById: ReadonlyMap<string, CrmDuplicateCandidateRecordSummary>;
  readonly excludeRecordId?: string | null;
  readonly maxCandidates: number;
  readonly maxEvidenceItems: number;
  readonly minConfidence?: CrmDuplicateConfidence;
  /** When false (default), archived/soft-deleted records are omitted. */
  readonly includeArchived?: boolean;
}): {
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly truncated: boolean;
  readonly totalCandidateCount: number;
} {
  const exclude = input.excludeRecordId?.trim() || null;
  const includeArchived = input.includeArchived === true;
  const incomingByKey = indexDraftsByLookup(input.probe.drafts);
  const evidenceByRecord = new Map<string, CrmDuplicateMatchEvidence[]>();

  for (const hit of input.hits) {
    if (exclude != null && hit.recordId === exclude) continue;
    const key = identityLookupKey(hit.valueType, hit.normalizedValue);
    const incomingDrafts = incomingByKey.get(key);
    if (incomingDrafts == null || incomingDrafts.length === 0) continue;

    const item = buildMatchEvidenceItem({
      valueType: hit.valueType,
      normalizedValue: hit.normalizedValue,
      incomingSources: incomingDrafts.map(asSource),
      existingSources: [
        {
          kind: hit.sourceKind,
          fieldKey: hit.sourceFieldKey,
          fieldLabel: hit.sourceFieldLabel,
        },
      ],
    });
    const list = evidenceByRecord.get(hit.recordId) ?? [];
    list.push(item);
    evidenceByRecord.set(hit.recordId, list);
  }

  const ranked: CrmDuplicateCandidate[] = [];
  for (const [recordId, rawEvidence] of evidenceByRecord) {
    const record = input.recordsById.get(recordId);
    if (record == null) continue;
    if (!isDuplicateCandidateLifecycleIncluded(record.lifecycleStatus, includeArchived)) {
      continue;
    }
    const merged = mergeDuplicateEvidence(rawEvidence);
    if (!shouldReturnDuplicateCandidate(merged, input.minConfidence)) continue;
    const capped = capEvidence(merged, input.maxEvidenceItems);
    ranked.push({
      record,
      confidence: classifyDuplicateConfidence(capped.evidence),
      score: scoreDuplicateEvidence(capped.evidence),
      evidence: capped.evidence,
    });
  }

  ranked.sort((a, b) =>
    compareDuplicateCandidates(
      {
        confidence: a.confidence,
        score: a.score,
        id: a.record.id,
        lifecycleStatus: a.record.lifecycleStatus,
      },
      {
        confidence: b.confidence,
        score: b.score,
        id: b.record.id,
        lifecycleStatus: b.record.lifecycleStatus,
      }
    )
  );

  const totalCandidateCount = ranked.length;
  const truncated = totalCandidateCount > input.maxCandidates;
  return {
    candidates: ranked.slice(0, input.maxCandidates),
    truncated,
    totalCandidateCount,
  };
}

/**
 * Build incoming↔incoming edges via value hash (no N×N row compare).
 */
export function buildIncomingIncomingEdges(
  probes: readonly CrmDuplicateProbeDrafts[],
  minConfidence?: CrmDuplicateConfidence
): readonly EdgeEvidence[] {
  const valueIndex = new Map<string, string[]>();
  const draftsByIncoming = new Map<string, Map<string, CrmIdentityValueDraft[]>>();

  for (const probe of probes) {
    draftsByIncoming.set(probe.incomingId, indexDraftsByLookup(probe.drafts));
    for (const draft of probe.drafts) {
      const key = identityLookupKey(draft.valueType, draft.normalizedValue);
      const list = valueIndex.get(key) ?? [];
      list.push(probe.incomingId);
      valueIndex.set(key, list);
    }
  }

  const pairEvidence = new Map<string, CrmDuplicateMatchEvidence[]>();

  for (const [lookupKey, incomingIds] of valueIndex) {
    const uniqueIds = [...new Set(incomingIds)].sort((a, b) => a.localeCompare(b));
    if (uniqueIds.length < 2) continue;
    const parsed = parseIdentityLookupKey(lookupKey);
    if (parsed == null) continue;

    for (let i = 0; i < uniqueIds.length; i += 1) {
      for (let j = i + 1; j < uniqueIds.length; j += 1) {
        const leftId = uniqueIds[i]!;
        const rightId = uniqueIds[j]!;
        const leftDrafts = draftsByIncoming.get(leftId)?.get(lookupKey) ?? [];
        const rightDrafts = draftsByIncoming.get(rightId)?.get(lookupKey) ?? [];
        const item = buildMatchEvidenceItem({
          valueType: parsed.valueType,
          normalizedValue: parsed.normalizedValue,
          incomingSources: leftDrafts.map(asSource),
          existingSources: rightDrafts.map(asSource),
        });
        const pairKey = `${leftId}::${rightId}`;
        const list = pairEvidence.get(pairKey) ?? [];
        list.push(item);
        pairEvidence.set(pairKey, list);
      }
    }
  }

  const edges: EdgeEvidence[] = [];
  for (const [pairKey, raw] of pairEvidence) {
    const [leftId, rightId] = pairKey.split('::') as [string, string];
    const merged = mergeDuplicateEvidence(raw);
    if (!shouldReturnDuplicateCandidate(merged, minConfidence)) continue;
    edges.push({ leftId, rightId, evidence: merged });
  }
  return edges;
}

export function buildDuplicateCandidateGroups(input: {
  readonly probes: readonly CrmDuplicateProbeDrafts[];
  readonly perIncomingCandidates: ReadonlyMap<
    string,
    { readonly candidates: readonly CrmDuplicateCandidate[]; readonly truncated: boolean }
  >;
  readonly incomingEdges: readonly EdgeEvidence[];
  readonly maxEvidenceItems: number;
  readonly maxGroups?: number;
  readonly minConfidence?: CrmDuplicateConfidence;
}): {
  readonly groups: readonly CrmDuplicateCandidateGroup[];
  readonly truncated: boolean;
  readonly totalGroupCount: number;
  readonly metaReasons: readonly string[];
} {
  const uf = new DuplicateUnionFind();
  const edgeEvidence = new Map<string, CrmDuplicateMatchEvidence[]>();
  const reasons: string[] = [];

  function rememberEdge(a: string, b: string, evidence: readonly CrmDuplicateMatchEvidence[]): void {
    const key = a < b ? `${a}||${b}` : `${b}||${a}`;
    const list = edgeEvidence.get(key) ?? [];
    list.push(...evidence);
    edgeEvidence.set(key, list);
  }

  for (const probe of input.probes) {
    uf.add(incomingNodeId(probe.incomingId));
  }

  for (const [incomingId, result] of input.perIncomingCandidates) {
    const left = incomingNodeId(incomingId);
    for (const candidate of result.candidates) {
      const right = existingNodeId(candidate.record.id);
      uf.union(left, right);
      rememberEdge(left, right, candidate.evidence);
    }
  }

  for (const edge of input.incomingEdges) {
    const left = incomingNodeId(edge.leftId);
    const right = incomingNodeId(edge.rightId);
    uf.union(left, right);
    rememberEdge(left, right, edge.evidence);
  }

  const rawGroups = uf.groups();
  const built: CrmDuplicateCandidateGroup[] = [];

  for (const [root, members] of rawGroups) {
    const incomingIds: string[] = [];
    const existingRecordIds: string[] = [];
    for (const member of members) {
      const parsed = parseGroupNodeId(member);
      if (parsed == null) continue;
      if (parsed.kind === 'incoming') incomingIds.push(parsed.id);
      else existingRecordIds.push(parsed.id);
    }

    // Singleton incoming with no matches is not a duplicate group
    if (incomingIds.length + existingRecordIds.length < 2) continue;
    if (incomingIds.length === 0) continue;

    const relatedEvidence: CrmDuplicateMatchEvidence[] = [];
    for (const [edgeKey, evidence] of edgeEvidence) {
      const [a, b] = edgeKey.split('||');
      if (members.includes(a!) && members.includes(b!)) {
        relatedEvidence.push(...evidence);
      }
    }
    const merged = mergeDuplicateEvidence(relatedEvidence);
    if (!shouldReturnDuplicateCandidate(merged, input.minConfidence)) continue;

    const capped = capEvidence(merged, input.maxEvidenceItems);
    const confidence = classifyDuplicateConfidence(capped.evidence);
    const score = scoreDuplicateEvidence(capped.evidence);

    const candidateMap = new Map<string, CrmDuplicateCandidate>();
    for (const incomingId of incomingIds) {
      for (const candidate of input.perIncomingCandidates.get(incomingId)?.candidates ?? []) {
        if (!existingRecordIds.includes(candidate.record.id)) continue;
        const prev = candidateMap.get(candidate.record.id);
        if (prev == null || candidate.score > prev.score) {
          candidateMap.set(candidate.record.id, candidate);
        }
      }
    }
    const candidates = [...candidateMap.values()].sort((a, b) =>
      compareDuplicateCandidates(
        {
          confidence: a.confidence,
          score: a.score,
          id: a.record.id,
          lifecycleStatus: a.record.lifecycleStatus,
        },
        {
          confidence: b.confidence,
          score: b.score,
          id: b.record.id,
          lifecycleStatus: b.record.lifecycleStatus,
        }
      )
    );

    incomingIds.sort((a, b) => a.localeCompare(b));
    existingRecordIds.sort((a, b) => a.localeCompare(b));

    built.push({
      groupKey: `dup:${root}`,
      incomingIds,
      existingRecordIds,
      confidence,
      score,
      evidence: capped.evidence,
      candidates,
    });
  }

  built.sort((a, b) => {
    const conf = compareDuplicateCandidates(
      {
        confidence: a.confidence,
        score: a.score,
        id: a.groupKey,
        lifecycleStatus: a.candidates[0]?.record.lifecycleStatus,
      },
      {
        confidence: b.confidence,
        score: b.score,
        id: b.groupKey,
        lifecycleStatus: b.candidates[0]?.record.lifecycleStatus,
      }
    );
    return conf;
  });

  const totalGroupCount = built.length;
  const maxGroups = input.maxGroups ?? Number.POSITIVE_INFINITY;
  const truncated = totalGroupCount > maxGroups;
  if (truncated) reasons.push('max_groups');

  return {
    groups: built.slice(0, Number.isFinite(maxGroups) ? maxGroups : built.length),
    truncated,
    totalGroupCount,
    metaReasons: reasons,
  };
}

export function uniqueLookupKeysWithinLimit(
  probes: readonly CrmDuplicateProbeDrafts[],
  maxUnique: number = CRM_DUPLICATE_DETECTION_LIMITS.maxUniqueIdentityValues
): {
  readonly keys: readonly string[];
  readonly truncated: boolean;
  readonly uniqueIdentityValueCount: number;
  readonly searchedIdentityValueCount: number;
} {
  const keys = collectUniqueLookupKeys(probes);
  const uniqueIdentityValueCount = keys.length;
  if (keys.length <= maxUnique) {
    return {
      keys,
      truncated: false,
      uniqueIdentityValueCount,
      searchedIdentityValueCount: keys.length,
    };
  }
  return {
    keys: keys.slice(0, maxUnique),
    truncated: true,
    uniqueIdentityValueCount,
    searchedIdentityValueCount: maxUnique,
  };
}

/** Prefer the better of two candidates for the same record id (deterministic). */
export function preferBetterDuplicateCandidate(
  current: CrmDuplicateCandidate | undefined,
  next: CrmDuplicateCandidate
): CrmDuplicateCandidate {
  if (current == null) return next;
  return compareDuplicateCandidates(
    {
      confidence: next.confidence,
      score: next.score,
      id: next.record.id,
      lifecycleStatus: next.record.lifecycleStatus,
    },
    {
      confidence: current.confidence,
      score: current.score,
      id: current.record.id,
      lifecycleStatus: current.record.lifecycleStatus,
    }
  ) < 0
    ? next
    : current;
}

export function mergeBestDuplicateCandidatesByRecordId(
  into: Map<string, CrmDuplicateCandidate>,
  candidates: readonly CrmDuplicateCandidate[]
): void {
  for (const candidate of candidates) {
    into.set(
      candidate.record.id,
      preferBetterDuplicateCandidate(into.get(candidate.record.id), candidate)
    );
  }
}

export function takeTopDuplicateCandidates(
  candidates: readonly CrmDuplicateCandidate[],
  maxCandidates: number
): {
  readonly candidates: readonly CrmDuplicateCandidate[];
  readonly truncated: boolean;
  readonly totalCandidateCount: number;
} {
  const ranked = [...candidates].sort((a, b) =>
    compareDuplicateCandidates(
      {
        confidence: a.confidence,
        score: a.score,
        id: a.record.id,
        lifecycleStatus: a.record.lifecycleStatus,
      },
      {
        confidence: b.confidence,
        score: b.score,
        id: b.record.id,
        lifecycleStatus: b.record.lifecycleStatus,
      }
    )
  );
  const totalCandidateCount = ranked.length;
  const truncated = totalCandidateCount > maxCandidates;
  return {
    candidates: ranked.slice(0, Math.max(0, maxCandidates)),
    truncated,
    totalCandidateCount,
  };
}

/**
 * Score matching existing records in bounded ID chunks, retaining global best
 * candidates per incoming row. Applies `maxCandidatesPerIncoming` only after
 * all successful chunks. Stops early on chunk failure (partial results kept).
 */
export async function accumulateBestCandidatesAcrossRecordChunks(input: {
  readonly incomingIds: readonly string[];
  readonly recordIds: readonly string[];
  readonly chunkSize: number;
  readonly maxCandidatesPerIncoming: number;
  readonly scoreChunk: (
    chunkRecordIds: readonly string[]
  ) => Promise<ReadonlyMap<string, readonly CrmDuplicateCandidate[]>>;
}): Promise<{
  readonly perIncoming: Map<
    string,
    { readonly candidates: readonly CrmDuplicateCandidate[]; readonly truncated: boolean }
  >;
  readonly matchingExistingRecordCount: number;
  readonly searchedExistingRecordCount: number;
  readonly chunkFailed: boolean;
  readonly chunkFailureMessage: string | null;
  readonly totalCandidateCount: number;
  readonly returnedCandidateCount: number;
  readonly candidateLimitTruncated: boolean;
}> {
  const sortedRecordIds = [...input.recordIds].sort((a, b) => a.localeCompare(b));
  const chunkSize = Math.max(1, input.chunkSize);
  const bestByIncoming = new Map<string, Map<string, CrmDuplicateCandidate>>();
  for (const incomingId of input.incomingIds) {
    bestByIncoming.set(incomingId, new Map());
  }

  let searchedExistingRecordCount = 0;
  let chunkFailed = false;
  let chunkFailureMessage: string | null = null;

  for (let offset = 0; offset < sortedRecordIds.length; offset += chunkSize) {
    const chunkIds = sortedRecordIds.slice(offset, offset + chunkSize);
    try {
      const scoredByIncoming = await input.scoreChunk(chunkIds);
      searchedExistingRecordCount += chunkIds.length;
      for (const incomingId of input.incomingIds) {
        const bucket = bestByIncoming.get(incomingId);
        if (bucket == null) continue;
        mergeBestDuplicateCandidatesByRecordId(
          bucket,
          scoredByIncoming.get(incomingId) ?? []
        );
      }
    } catch (err) {
      chunkFailed = true;
      chunkFailureMessage = err instanceof Error ? err.message : 'unknown_error';
      break;
    }
  }

  const perIncoming = new Map<
    string,
    { readonly candidates: readonly CrmDuplicateCandidate[]; readonly truncated: boolean }
  >();
  let totalCandidateCount = 0;
  let returnedCandidateCount = 0;
  let candidateLimitTruncated = false;

  for (const incomingId of input.incomingIds) {
    const bucket = bestByIncoming.get(incomingId) ?? new Map();
    const taken = takeTopDuplicateCandidates(
      [...bucket.values()],
      input.maxCandidatesPerIncoming
    );
    perIncoming.set(incomingId, {
      candidates: taken.candidates,
      truncated: taken.truncated,
    });
    totalCandidateCount += taken.totalCandidateCount;
    returnedCandidateCount += taken.candidates.length;
    if (taken.truncated) candidateLimitTruncated = true;
  }

  return {
    perIncoming,
    matchingExistingRecordCount: sortedRecordIds.length,
    searchedExistingRecordCount,
    chunkFailed,
    chunkFailureMessage,
    totalCandidateCount,
    returnedCandidateCount,
    candidateLimitTruncated,
  };
}
