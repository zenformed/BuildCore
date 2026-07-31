import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyDuplicateConfidence,
  compareDuplicateCandidates,
  scoreDuplicateEvidence,
  shouldReturnDuplicateCandidate,
} from './duplicateConfidence';
import type { CrmDuplicateMatchEvidence } from './duplicateCandidateTypes';
import { CRM_DUPLICATE_SCORE_WEIGHTS } from './duplicateCandidateTypes';

function evidence(
  valueType: CrmDuplicateMatchEvidence['valueType'],
  normalizedValue: string
): CrmDuplicateMatchEvidence {
  return {
    valueType,
    normalizedValue,
    incomingSources: [{ kind: 'contact_name', fieldKey: 'x', fieldLabel: 'X' }],
    existingSources: [{ kind: 'custom_field', fieldKey: 'y', fieldLabel: 'Y' }],
  };
}

describe('duplicateConfidence', () => {
  it('scores each value type once even with repeated evidence rows', () => {
    const score = scoreDuplicateEvidence([
      evidence('email', 'a@b.com'),
      evidence('email', 'a@b.com'),
      evidence('name', 'brenda smith'),
    ]);
    assert.equal(
      score,
      CRM_DUPLICATE_SCORE_WEIGHTS.email + CRM_DUPLICATE_SCORE_WEIGHTS.name
    );
  });

  it('classifies email or phone as high', () => {
    assert.equal(classifyDuplicateConfidence([evidence('email', 'a@b.com')]), 'high');
    assert.equal(classifyDuplicateConfidence([evidence('phone', '6155551111')]), 'high');
  });

  it('classifies name + address as high and name-only as low', () => {
    assert.equal(
      classifyDuplicateConfidence([
        evidence('name', 'brenda smith'),
        evidence('address', '100 main st nashville tn 37201'),
      ]),
      'high'
    );
    assert.equal(classifyDuplicateConfidence([evidence('name', 'brenda smith')]), 'low');
  });

  it('rejects lone identity_text below min score', () => {
    assert.equal(
      shouldReturnDuplicateCandidate([evidence('identity_text', 'plot 42')]),
      false
    );
  });

  it('accepts name-only as low confidence candidate', () => {
    assert.equal(
      shouldReturnDuplicateCandidate([evidence('name', 'brenda smith')]),
      true
    );
    assert.equal(
      shouldReturnDuplicateCandidate([evidence('name', 'brenda smith')], 'medium'),
      false
    );
  });

  it('ranks active before inactive before archived', () => {
    const ordered = [
      { confidence: 'high' as const, score: 100, id: 'archived', lifecycleStatus: 'archived' as const },
      { confidence: 'high' as const, score: 100, id: 'inactive', lifecycleStatus: 'inactive' as const },
      { confidence: 'high' as const, score: 100, id: 'active', lifecycleStatus: 'active' as const },
    ].sort(compareDuplicateCandidates);
    assert.deepEqual(
      ordered.map((item) => item.id),
      ['active', 'inactive', 'archived']
    );
  });
});
