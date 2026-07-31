import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  areImportDuplicateDecisionsComplete,
  buildImportDuplicateReviewItems,
  chunkArrayForImportDuplicateBatch,
  countImportRowsToCreate,
  importDuplicateIncomingId,
  mergeImportDuplicateBatchMeta,
  parseImportDuplicateIncomingId,
  skippedSourceRowIndexesFromDecisions,
  summarizeImportDuplicateDecisions,
  type ImportDuplicateDecisionMap,
} from './importDuplicateDecisions';
import type {
  CrmDuplicateCandidate,
  CrmDuplicateCandidateGroup,
} from './identity';
import { CRM_DUPLICATE_DETECTION_LIMITS } from './identity';

function candidate(id: string, score = 100): CrmDuplicateCandidate {
  return {
    record: {
      id,
      slug: id,
      recordType: 'subproject',
      name: `Record ${id}`,
      parentProjectId: null,
      parentProjectSlug: null,
      parentProjectName: null,
      contactName: null,
      emails: [],
      phones: [],
      addressLine: null,
      notes: null,
      photoCount: 0,
      documentCount: 0,
      customFields: [],
      stageSlug: 'lead',
      stageLabel: 'Lead',
      lifecycleStatus: 'active',
      subprojectStatus: 'active',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    confidence: 'high',
    score,
    evidence: [],
  };
}

function group(
  key: string,
  incomingIds: string[],
  existingRecordIds: string[],
  candidates: CrmDuplicateCandidate[]
): CrmDuplicateCandidateGroup {
  return {
    groupKey: key,
    incomingIds,
    existingRecordIds,
    confidence: 'high',
    score: 100,
    evidence: [],
    candidates,
  };
}

describe('importDuplicateDecisions', () => {
  it('keys incoming rows by sourceRowIndex, not list position', () => {
    assert.equal(importDuplicateIncomingId(42), 'row:42');
    assert.equal(parseImportDuplicateIncomingId('row:42'), 42);
    assert.equal(parseImportDuplicateIncomingId('bad'), null);
  });

  it('chunks batch requests at 200 rows', () => {
    const items = Array.from({ length: 450 }, (_, i) => i);
    const chunks = chunkArrayForImportDuplicateBatch(
      items,
      CRM_DUPLICATE_DETECTION_LIMITS.maxBatchRows
    );
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0]!.length, 200);
    assert.equal(chunks[1]!.length, 200);
    assert.equal(chunks[2]!.length, 50);
  });

  it('merges batch truncation meta', () => {
    const meta = mergeImportDuplicateBatchMeta([
      {
        truncated: false,
        returnedCandidateCount: 2,
        totalCandidateCount: 2,
        incomingRowCount: 100,
        uniqueIdentityValueCount: 40,
        searchedIdentityValueCount: 40,
        matchingExistingRecordCount: 10,
        searchedExistingRecordCount: 10,
        returnedGroupCount: 1,
        totalGroupCount: 1,
      },
      {
        truncated: true,
        returnedCandidateCount: 3,
        totalCandidateCount: 10,
        incomingRowCount: 50,
        uniqueIdentityValueCount: 20,
        searchedIdentityValueCount: 20,
        matchingExistingRecordCount: 5,
        searchedExistingRecordCount: 5,
        returnedGroupCount: 2,
        totalGroupCount: 4,
        reasons: ['max_unique_identity_values'],
      },
    ]);
    assert.equal(meta.truncated, true);
    assert.equal(meta.returnedCandidateCount, 5);
    assert.equal(meta.totalCandidateCount, 12);
    assert.equal(meta.incomingRowCount, 150);
    assert.equal(meta.uniqueIdentityValueCount, 60);
    assert.equal(meta.searchedIdentityValueCount, 60);
    assert.equal(meta.matchingExistingRecordCount, 15);
    assert.equal(meta.searchedExistingRecordCount, 15);
    assert.equal(meta.returnedGroupCount, 3);
    assert.equal(meta.totalGroupCount, 5);
    assert.deepEqual(meta.reasons, ['max_unique_identity_values']);
  });

  it('requires decisions only for rows with matches', () => {
    const needing = ['row:1', 'row:2'];
    const incomplete: ImportDuplicateDecisionMap = {
      'row:1': { incomingId: 'row:1', sameCustomer: false },
    };
    assert.equal(areImportDuplicateDecisionsComplete(needing, incomplete), false);
    assert.equal(
      areImportDuplicateDecisionsComplete(needing, {
        'row:1': { incomingId: 'row:1', sameCustomer: false },
        'row:2': { incomingId: 'row:2', sameCustomer: true, matchedRecordId: 'e1' },
      }),
      true
    );
    assert.equal(areImportDuplicateDecisionsComplete([], {}), true);
  });

  it('skips only same-customer rows until merge ships', () => {
    const decisions: ImportDuplicateDecisionMap = {
      'row:1': { incomingId: 'row:1', sameCustomer: true, matchedRecordId: 'e1' },
      'row:2': { incomingId: 'row:2', sameCustomer: false },
      'row:5': { incomingId: 'row:5', sameCustomer: true, matchedRecordId: 'e2' },
    };
    assert.deepEqual(skippedSourceRowIndexesFromDecisions(decisions), [1, 5]);
  });

  it('does not skip keep-both; skips merge and replace after apply', () => {
    const decisions: ImportDuplicateDecisionMap = {
      'row:1': { incomingId: 'row:1', sameCustomer: true, matchedRecordId: 'e1' },
      'row:2': { incomingId: 'row:2', sameCustomer: true, matchedRecordId: 'e2' },
      'row:3': { incomingId: 'row:3', sameCustomer: true, matchedRecordId: 'e3' },
      'row:4': { incomingId: 'row:4', sameCustomer: false },
    };
    const mergeDecisions = {
      'row:1': {
        incomingId: 'row:1',
        matchedRecordId: 'e1',
        recordAction: 'merge_into_existing' as const,
        replaceConfirmed: false,
        fields: [],
        showIdenticalFields: false,
        showAllCustomFields: false,
      },
      'row:2': {
        incomingId: 'row:2',
        matchedRecordId: 'e2',
        recordAction: 'keep_both' as const,
        replaceConfirmed: false,
        fields: [],
        showIdenticalFields: false,
        showAllCustomFields: false,
      },
      'row:3': {
        incomingId: 'row:3',
        matchedRecordId: 'e3',
        recordAction: 'replace_existing' as const,
        replaceConfirmed: true,
        fields: [],
        showIdenticalFields: false,
        showAllCustomFields: false,
      },
    };
    assert.deepEqual(skippedSourceRowIndexesFromDecisions(decisions, mergeDecisions), [1, 3]);
    assert.equal(countImportRowsToCreate(4, decisions, mergeDecisions), 2);
  });

  it('builds review items for existing and incoming-to-incoming matches', () => {
    const summaries = new Map([
      [
        'row:1',
        {
          sourceRowIndex: 1,
          name: 'Ada',
          contactName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: null,
          addressLine: null,
        },
      ],
      [
        'row:2',
        {
          sourceRowIndex: 2,
          name: 'Ada L',
          contactName: 'Ada L',
          email: 'ada@example.com',
          phone: null,
          addressLine: null,
        },
      ],
      [
        'row:3',
        {
          sourceRowIndex: 3,
          name: 'Unique',
          contactName: null,
          email: 'u@example.com',
          phone: null,
          addressLine: null,
        },
      ],
    ]);
    const items = buildImportDuplicateReviewItems({
      groups: [
        group('g1', ['row:1'], ['e1'], [candidate('e1')]),
        group('g2', ['row:1', 'row:2'], [], []),
      ],
      rowSummariesByIncomingId: summaries,
    });
    assert.equal(items.length, 2);
    const row1 = items.find((i) => i.incomingId === 'row:1');
    assert.ok(row1);
    assert.equal(row1.existingCandidates.length, 1);
    assert.equal(row1.peerIncoming.length, 1);
    assert.equal(row1.peerIncoming[0]?.incomingId, 'row:2');
  });

  it('summarizes same/different customer answers for final review', () => {
    const summary = summarizeImportDuplicateDecisions({
      totalIncomingRows: 5,
      groups: [
        group('g1', ['row:1'], ['e1'], [candidate('e1')]),
        group('g2', ['row:2', 'row:3'], [], []),
      ],
      decisions: {
        'row:1': { incomingId: 'row:1', sameCustomer: false },
        'row:2': { incomingId: 'row:2', sameCustomer: true },
        'row:3': { incomingId: 'row:3', sameCustomer: false },
      },
      meta: { truncated: true, returnedCandidateCount: 1 },
    });
    assert.equal(summary.totalIncomingRows, 5);
    assert.equal(summary.rowsWithPossibleDuplicates, 3);
    assert.equal(summary.sameCustomerCount, 1);
    assert.equal(summary.differentCustomerCount, 2);
    assert.equal(summary.existingMatchCount, 1);
    assert.equal(summary.incomingToIncomingMatchCount, 2);
    assert.equal(summary.truncated, true);
    assert.equal(summary.truncationMeta?.truncated, true);
  });
});
