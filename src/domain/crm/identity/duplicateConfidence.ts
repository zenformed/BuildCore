import type { CrmIdentityValueType } from './identityTypes';
import {
  CRM_DUPLICATE_MIN_SCORE_TO_RETURN,
  CRM_DUPLICATE_SCORE_WEIGHTS,
  type CrmDuplicateConfidence,
  type CrmDuplicateLifecycleStatus,
  type CrmDuplicateMatchEvidence,
} from './duplicateCandidateTypes';

function uniqueValueTypes(
  evidence: readonly CrmDuplicateMatchEvidence[]
): ReadonlySet<CrmIdentityValueType> {
  return new Set(evidence.map((item) => item.valueType));
}

/**
 * Deterministic score from evidence. Counts each valueType once so duplicate
 * source rows (legacy email mirror, multiple name fields) cannot inflate score.
 */
export function scoreDuplicateEvidence(
  evidence: readonly CrmDuplicateMatchEvidence[]
): number {
  let score = 0;
  for (const valueType of uniqueValueTypes(evidence)) {
    score += CRM_DUPLICATE_SCORE_WEIGHTS[valueType];
  }
  return score;
}

/**
 * Confidence classification from matched value types (not raw score alone).
 *
 * High: email, phone, name+address, name+email, name+phone, or multiple strong signals
 * Medium: name + supporting identity_text; address + person signal; multiple identity_text
 * Low: name only; weaker combinations that still clear the min score
 */
export function classifyDuplicateConfidence(
  evidence: readonly CrmDuplicateMatchEvidence[]
): CrmDuplicateConfidence {
  const types = uniqueValueTypes(evidence);
  const hasEmail = types.has('email');
  const hasPhone = types.has('phone');
  const hasName = types.has('name');
  const hasAddress = types.has('address');
  const hasIdentityText = types.has('identity_text');
  const identityTextCount = evidence.filter((e) => e.valueType === 'identity_text').length;

  if (hasEmail || hasPhone) return 'high';
  if (hasName && (hasAddress || hasEmail || hasPhone)) return 'high';

  if (hasName && hasIdentityText) return 'medium';
  if (hasAddress && (hasName || hasIdentityText || hasEmail || hasPhone)) return 'medium';
  if (identityTextCount >= 2) return 'medium';

  return 'low';
}

export function confidenceRank(confidence: CrmDuplicateConfidence): number {
  switch (confidence) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default: {
      const _exhaustive: never = confidence;
      return _exhaustive;
    }
  }
}

/** Prefer active, then inactive, then archived (when included). */
export function lifecycleRank(lifecycleStatus: CrmDuplicateLifecycleStatus): number {
  switch (lifecycleStatus) {
    case 'active':
      return 3;
    case 'inactive':
      return 2;
    case 'archived':
      return 1;
    default: {
      const _exhaustive: never = lifecycleStatus;
      return _exhaustive;
    }
  }
}

/**
 * Soft-deleted records use archived_at / lifecycleStatus === 'archived'.
 * They are excluded unless includeArchived is explicitly true.
 */
export function isDuplicateCandidateLifecycleIncluded(
  lifecycleStatus: CrmDuplicateLifecycleStatus,
  includeArchived: boolean
): boolean {
  if (lifecycleStatus === 'archived') return includeArchived;
  return true;
}

export function meetsMinConfidence(
  confidence: CrmDuplicateConfidence,
  minConfidence: CrmDuplicateConfidence | undefined
): boolean {
  if (minConfidence == null) return true;
  return confidenceRank(confidence) >= confidenceRank(minConfidence);
}

export function shouldReturnDuplicateCandidate(
  evidence: readonly CrmDuplicateMatchEvidence[],
  minConfidence?: CrmDuplicateConfidence
): boolean {
  if (evidence.length === 0) return false;
  const score = scoreDuplicateEvidence(evidence);
  if (score < CRM_DUPLICATE_MIN_SCORE_TO_RETURN) return false;
  const confidence = classifyDuplicateConfidence(evidence);
  return meetsMinConfidence(confidence, minConfidence);
}

export function compareDuplicateCandidates(
  a: {
    readonly confidence: CrmDuplicateConfidence;
    readonly score: number;
    readonly id: string;
    readonly lifecycleStatus?: CrmDuplicateLifecycleStatus;
  },
  b: {
    readonly confidence: CrmDuplicateConfidence;
    readonly score: number;
    readonly id: string;
    readonly lifecycleStatus?: CrmDuplicateLifecycleStatus;
  }
): number {
  const lifeA = a.lifecycleStatus != null ? lifecycleRank(a.lifecycleStatus) : 0;
  const lifeB = b.lifecycleStatus != null ? lifecycleRank(b.lifecycleStatus) : 0;
  if (lifeB !== lifeA) return lifeB - lifeA;
  const conf = confidenceRank(b.confidence) - confidenceRank(a.confidence);
  if (conf !== 0) return conf;
  if (b.score !== a.score) return b.score - a.score;
  return a.id.localeCompare(b.id);
}
