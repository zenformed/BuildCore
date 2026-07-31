import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmDuplicateCandidate } from './duplicateCandidateTypes';
import { accumulateBestCandidatesAcrossRecordChunks } from './duplicateMatchingCore';

function candidate(
  recordId: string,
  score: number,
  confidence: CrmDuplicateCandidate['confidence'] = 'medium'
): CrmDuplicateCandidate {
  return {
    record: {
      id: recordId,
      slug: `slug-${recordId}`,
      recordType: 'subproject',
      name: `Lead ${recordId}`,
      parentProjectId: 'parent-1',
      parentProjectSlug: 'parent-slug',
      parentProjectName: 'Show',
      contactName: null,
      emails: [],
      phones: [],
      addressLine: null,
      notes: null,
      photoCount: 0,
      documentCount: 0,
      customFields: [],
      stageSlug: 'intake',
      stageLabel: 'Intake',
      lifecycleStatus: 'active',
      subprojectStatus: 'normal',
      archivedAt: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    },
    confidence,
    score,
    evidence: [],
  };
}

describe('accumulateBestCandidatesAcrossRecordChunks', () => {
  it('processes all existing-record chunks for >200 matching IDs (29-row style)', async () => {
    const incomingIds = Array.from({ length: 29 }, (_, i) => `row:${i + 1}`);
    const recordIds = Array.from({ length: 250 }, (_, i) => `rec-${String(i).padStart(3, '0')}`);
    const scoredChunks: string[][] = [];

    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds,
      recordIds,
      chunkSize: 200,
      maxCandidatesPerIncoming: 10,
      scoreChunk: async (chunkIds) => {
        scoredChunks.push([...chunkIds]);
        const byIncoming = new Map<string, CrmDuplicateCandidate[]>();
        for (const incomingId of incomingIds) {
          byIncoming.set(
            incomingId,
            chunkIds.slice(0, 2).map((id, index) => candidate(id, 100 - index))
          );
        }
        return byIncoming;
      },
    });

    assert.equal(scoredChunks.length, 2);
    assert.equal(scoredChunks[0]?.length, 200);
    assert.equal(scoredChunks[1]?.length, 50);
    assert.equal(result.chunkFailed, false);
    assert.equal(result.matchingExistingRecordCount, 250);
    assert.equal(result.searchedExistingRecordCount, 250);
    assert.equal(result.candidateLimitTruncated, false);
  });

  it('returns a candidate found only in a later chunk', async () => {
    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds: ['row:1'],
      recordIds: ['a', 'b', 'late-hit'],
      chunkSize: 2,
      maxCandidatesPerIncoming: 10,
      scoreChunk: async (chunkIds) => {
        const hits: CrmDuplicateCandidate[] = [];
        if (chunkIds.includes('late-hit')) {
          hits.push(candidate('late-hit', 100, 'high'));
        }
        if (chunkIds.includes('a')) {
          hits.push(candidate('a', 40, 'low'));
        }
        return new Map([['row:1', hits]]);
      },
    });

    const returned = result.perIncoming.get('row:1')?.candidates ?? [];
    assert.equal(returned.some((c) => c.record.id === 'late-hit'), true);
    assert.equal(result.searchedExistingRecordCount, 3);
    assert.equal(result.chunkFailed, false);
  });

  it('keeps global top candidates across chunks (not per-chunk top-N concat)', async () => {
    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds: ['row:1'],
      recordIds: ['c1', 'c2', 'c3', 'c4'],
      chunkSize: 2,
      maxCandidatesPerIncoming: 2,
      scoreChunk: async (chunkIds) => {
        const scores: Record<string, number> = {
          c1: 50,
          c2: 90,
          c3: 80,
          c4: 60,
        };
        return new Map([
          [
            'row:1',
            chunkIds.map((id) => candidate(id, scores[id] ?? 0)),
          ],
        ]);
      },
    });

    const ids = (result.perIncoming.get('row:1')?.candidates ?? []).map((c) => c.record.id);
    assert.deepEqual(ids, ['c2', 'c3']);
    assert.equal(result.candidateLimitTruncated, true);
    assert.equal(result.totalCandidateCount, 4);
    assert.equal(result.returnedCandidateCount, 2);
  });

  it('deduplicates the same existing record seen in multiple chunks', async () => {
    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds: ['row:1'],
      recordIds: ['dup', 'other'],
      chunkSize: 1,
      maxCandidatesPerIncoming: 10,
      scoreChunk: async (chunkIds) => {
        // Simulate overlapping identity hits returning the same record id again.
        const hits = [candidate('dup', chunkIds[0] === 'dup' ? 40 : 100, 'high')];
        if (chunkIds[0] === 'other') {
          hits.push(candidate('other', 50));
        }
        return new Map([['row:1', hits]]);
      },
    });

    const returned = result.perIncoming.get('row:1')?.candidates ?? [];
    const dupHits = returned.filter((c) => c.record.id === 'dup');
    assert.equal(dupHits.length, 1);
    assert.equal(dupHits[0]?.score, 100);
  });

  it('reports partial coverage when a later chunk fails', async () => {
    let calls = 0;
    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds: ['row:1'],
      recordIds: ['a', 'b', 'c', 'd'],
      chunkSize: 2,
      maxCandidatesPerIncoming: 10,
      scoreChunk: async (chunkIds) => {
        calls += 1;
        if (calls === 2) {
          throw new Error('hydrate_failed');
        }
        return new Map([['row:1', [candidate(chunkIds[0]!, 100)]]]);
      },
    });

    assert.equal(result.chunkFailed, true);
    assert.equal(result.chunkFailureMessage, 'hydrate_failed');
    assert.equal(result.matchingExistingRecordCount, 4);
    assert.equal(result.searchedExistingRecordCount, 2);
    assert.equal(
      (result.perIncoming.get('row:1')?.candidates ?? []).some((c) => c.record.id === 'a'),
      true
    );
  });

  it('leaves small searches unchanged (single chunk, no truncation)', async () => {
    const result = await accumulateBestCandidatesAcrossRecordChunks({
      incomingIds: ['row:1'],
      recordIds: ['only'],
      chunkSize: 1_000,
      maxCandidatesPerIncoming: 10,
      scoreChunk: async () => new Map([['row:1', [candidate('only', 100, 'high')]]]),
    });

    assert.equal(result.chunkFailed, false);
    assert.equal(result.matchingExistingRecordCount, 1);
    assert.equal(result.searchedExistingRecordCount, 1);
    assert.equal(result.candidateLimitTruncated, false);
    assert.deepEqual(
      (result.perIncoming.get('row:1')?.candidates ?? []).map((c) => c.record.id),
      ['only']
    );
  });
});
