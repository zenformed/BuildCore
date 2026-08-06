import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmDuplicateCandidate } from '@/domain/crm/identity';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';
import {
  buildMatchEvidenceColumns,
  reviewItemIdentifier,
  sortDuplicateReviewItemsForTable,
} from './duplicateReviewTablePresentation';

function candidate(
  confidence: CrmDuplicateCandidate['confidence'],
  score: number,
  evidenceCount: number
): CrmDuplicateCandidate {
  return {
    record: {
      id: `${confidence}-${score}`,
      slug: 'x',
      recordType: 'subproject',
      name: 'X',
      parentProjectId: null,
      parentProjectSlug: null,
      parentProjectName: 'Parent',
      contactName: null,
      emails: ['a@b.com'],
      phones: ['111'],
      addressLine: null,
      notes: null,
      photoCount: 0,
      documentCount: 0,
      customFields: [],
      stageSlug: 'lead',
      stageLabel: 'Lead',
      lifecycleStatus: 'active',
      subprojectStatus: 'normal',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    confidence,
    score,
    evidence: Array.from({ length: evidenceCount }, (_, i) => ({
      valueType: i % 2 === 0 ? ('email' as const) : ('phone' as const),
      normalizedValue: `v${i}`,
      incomingSources: [
        { kind: 'contact_email', fieldKey: 'email', fieldLabel: i % 2 === 0 ? 'Email' : 'Phone' },
      ],
      existingSources: [
        {
          kind: 'contact_email',
          fieldKey: 'cust_email',
          fieldLabel: i % 2 === 0 ? 'CustEmail' : 'CustPhone',
        },
      ],
    })),
  };
}

function item(
  sourceRowIndex: number,
  existing: readonly CrmDuplicateCandidate[],
  peers = 0
): ImportDuplicateReviewItem {
  return {
    incomingId: `row:${sourceRowIndex}`,
    sourceRowIndex,
    displayRowNumber: sourceRowIndex + 1,
    name: `Row ${sourceRowIndex}`,
    contactName: null,
    email: 'a@b.com',
    phone: '111',
    emails: ['a@b.com'],
    phones: ['111'],
    addressLine: null,
    stage: null,
    notes: null,
    customFields: [],
    existingCandidates: existing,
    peerIncoming: Array.from({ length: peers }, (_, i) => ({
      incomingId: `peer:${i}`,
      sourceRowIndex: 100 + i,
      displayRowNumber: 101 + i,
      name: 'Peer',
      contactName: null,
      email: null,
      phone: null,
      addressLine: null,
    })),
  };
}

describe('duplicateReviewTablePresentation', () => {
  it('sorts by confidence, then evidence count, then spreadsheet row', () => {
    const sorted = sortDuplicateReviewItemsForTable([
      item(5, [candidate('low', 40, 1)]),
      item(2, [candidate('high', 100, 1)]),
      item(4, [candidate('high', 100, 3)]),
      item(3, [candidate('medium', 70, 2)]),
      item(1, [], 1),
    ]);
    assert.deepEqual(
      sorted.map((row) => row.sourceRowIndex),
      [4, 2, 3, 5, 1]
    );
  });

  it('builds at most three match evidence columns with hidden count', () => {
    const row = item(2, [candidate('high', 100, 5)]);
    const { columns, hiddenCount } = buildMatchEvidenceColumns({
      item: row,
      candidate: row.existingCandidates[0]!,
    });
    assert.equal(columns.length, 3);
    assert.equal(hiddenCount, 2);
    assert.equal(columns[0]?.incomingFieldLabel, 'Email');
    assert.equal(columns[0]?.existingFieldLabel, 'CustEmail');
  });

  it('prefers contact name as identifier', () => {
    assert.equal(
      reviewItemIdentifier({ name: 'Project', contactName: 'Antoinette' }),
      'Antoinette'
    );
    assert.equal(reviewItemIdentifier({ name: 'Project', contactName: null }), 'Project');
  });
});
