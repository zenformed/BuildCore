import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractIdentityValues } from './extractIdentityValues';
import type { CrmIdentityRecordSnapshot } from './identityTypes';
import type { CrmDuplicateCandidateRecordSummary } from './duplicateCandidateTypes';
import {
  buildDuplicateCandidateGroups,
  buildIncomingIncomingEdges,
  matchProbeAgainstIdentityHits,
  type CrmDuplicateIdentityHit,
  type CrmDuplicateProbeDrafts,
} from './duplicateMatchingCore';

function snapshot(
  overrides: Partial<CrmIdentityRecordSnapshot> & { recordId: string }
): CrmIdentityRecordSnapshot {
  return {
    organizationId: 'org-1',
    recordType: 'subproject',
    projectName: null,
    contactName: null,
    emails: [],
    phones: [],
    address: {
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
    },
    customFields: [],
    ...overrides,
  };
}

function recordSummary(
  id: string,
  lifecycleStatus: CrmDuplicateCandidateRecordSummary['lifecycleStatus'] = 'active'
): CrmDuplicateCandidateRecordSummary {
  return {
    id,
    slug: `slug-${id}`,
    recordType: 'subproject',
    name: `Lead ${id}`,
    parentProjectId: 'parent-1',
    parentProjectSlug: 'parent-slug',
    parentProjectName: 'Show',
    contactName: 'Brenda Smith',
    emails: ['brenda@example.com'],
    phones: ['(615) 555-1111'],
    addressLine: '100 Main St, Nashville, TN 37201',
    notes: null,
    photoCount: 0,
    documentCount: 0,
    customFields: [],
    stageSlug: 'intake',
    stageLabel: 'Intake',
    lifecycleStatus,
    subprojectStatus: lifecycleStatus === 'inactive' ? 'inactive' : 'normal',
    archivedAt: lifecycleStatus === 'archived' ? '2024-01-01T00:00:00.000Z' : null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  };
}

function hitsFromSnapshot(recordId: string, snap: CrmIdentityRecordSnapshot): CrmDuplicateIdentityHit[] {
  return extractIdentityValues(snap).map((draft) => ({
    recordId,
    valueType: draft.valueType,
    normalizedValue: draft.normalizedValue,
    sourceKind: draft.sourceKind,
    sourceFieldKey: draft.sourceFieldKey,
    sourceFieldLabel: draft.sourceFieldLabel,
  }));
}

describe('duplicateMatchingCore', () => {
  it('matches cross-field Bride/phone to First+Last/mobile as high confidence', () => {
    const existingSnap = snapshot({
      recordId: 'existing-a',
      customFields: [
        {
          definitionId: 'd1',
          valueId: 'v1',
          fieldKey: 'bride',
          label: 'Bride',
          valueText: 'Brenda Smith',
        },
        {
          definitionId: 'd2',
          valueId: 'v2',
          fieldKey: 'bride_phone',
          label: 'Bride Phone',
          valueText: '(615) 555-1111',
        },
      ],
    });
    // bride_phone may classify as phone via "phone" in label
    const existingHits = hitsFromSnapshot('existing-a', existingSnap);

    const probe: CrmDuplicateProbeDrafts = {
      incomingId: 'row-1',
      drafts: extractIdentityValues(
        snapshot({
          recordId: 'probe',
          customFields: [
            {
              definitionId: 'd3',
              valueId: null,
              fieldKey: 'first_name',
              label: 'First Name',
              valueText: 'Brenda',
            },
            {
              definitionId: 'd4',
              valueId: null,
              fieldKey: 'last_name',
              label: 'Last Name',
              valueText: 'Smith',
            },
            {
              definitionId: 'd5',
              valueId: null,
              fieldKey: 'mobile_phone',
              label: 'Mobile Phone',
              valueText: '6155551111',
            },
          ],
        })
      ),
    };

    const result = matchProbeAgainstIdentityHits({
      probe,
      hits: existingHits,
      recordsById: new Map([['existing-a', recordSummary('existing-a')]]),
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });

    assert.equal(result.candidates.length, 1);
    const candidate = result.candidates[0]!;
    assert.equal(candidate.confidence, 'high');
    assert.ok(candidate.evidence.some((e) => e.valueType === 'name' && e.normalizedValue === 'brenda smith'));
    assert.ok(candidate.evidence.some((e) => e.valueType === 'phone' && e.normalizedValue === '6155551111'));
    const nameEvidence = candidate.evidence.find((e) => e.valueType === 'name');
    assert.ok(nameEvidence?.incomingSources.some((s) => s.fieldKey?.includes('first_name')));
    assert.ok(nameEvidence?.existingSources.some((s) => s.fieldKey === 'bride' || s.fieldLabel === 'Bride'));
  });

  it('matches email casing and phone formatting; excludes self on edit', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'rec-1',
        valueType: 'email',
        normalizedValue: 'brenda@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
      {
        recordId: 'rec-1',
        valueType: 'phone',
        normalizedValue: '6155551111',
        sourceKind: 'contact_phone',
        sourceFieldKey: 'contact_phones',
        sourceFieldLabel: 'Phone',
      },
      {
        recordId: 'rec-2',
        valueType: 'email',
        normalizedValue: 'brenda@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
    ];

    const probe: CrmDuplicateProbeDrafts = {
      incomingId: 'edit',
      drafts: extractIdentityValues(
        snapshot({
          recordId: 'edit',
          emails: ['Brenda@Example.COM'],
          phones: ['(615) 555-1111'],
        })
      ),
    };

    const withSelf = matchProbeAgainstIdentityHits({
      probe,
      hits,
      recordsById: new Map([
        ['rec-1', recordSummary('rec-1')],
        ['rec-2', recordSummary('rec-2')],
      ]),
      excludeRecordId: 'rec-1',
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });

    assert.equal(withSelf.candidates.length, 1);
    assert.equal(withSelf.candidates[0]?.record.id, 'rec-2');
    assert.equal(withSelf.candidates[0]?.confidence, 'high');
  });

  it('returns inactive candidates and excludes archived by default', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'archived-1',
        valueType: 'email',
        normalizedValue: 'old@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
      {
        recordId: 'inactive-1',
        valueType: 'email',
        normalizedValue: 'old@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
      {
        recordId: 'active-1',
        valueType: 'email',
        normalizedValue: 'old@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
    ];
    const probe: CrmDuplicateProbeDrafts = {
      incomingId: 'n',
      drafts: extractIdentityValues(
        snapshot({ recordId: 'n', emails: ['old@example.com'] })
      ),
    };
    const recordsById = new Map([
      ['archived-1', recordSummary('archived-1', 'archived')],
      ['inactive-1', recordSummary('inactive-1', 'inactive')],
      ['active-1', recordSummary('active-1', 'active')],
    ]);

    const defaultResult = matchProbeAgainstIdentityHits({
      probe,
      hits,
      recordsById,
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });
    assert.equal(defaultResult.candidates.length, 2);
    assert.ok(defaultResult.candidates.every((c) => c.record.lifecycleStatus !== 'archived'));
    assert.ok(defaultResult.candidates.some((c) => c.record.lifecycleStatus === 'inactive'));
    assert.ok(defaultResult.candidates.some((c) => c.record.lifecycleStatus === 'active'));
    // Active before inactive
    assert.equal(defaultResult.candidates[0]?.record.lifecycleStatus, 'active');
    assert.equal(defaultResult.candidates[1]?.record.lifecycleStatus, 'inactive');

    const withArchived = matchProbeAgainstIdentityHits({
      probe,
      hits,
      recordsById,
      maxCandidates: 10,
      maxEvidenceItems: 20,
      includeArchived: true,
    });
    assert.equal(withArchived.candidates.length, 3);
    assert.ok(withArchived.candidates.some((c) => c.record.lifecycleStatus === 'archived'));
    assert.equal(withArchived.candidates[0]?.record.lifecycleStatus, 'active');
    assert.equal(withArchived.candidates[1]?.record.lifecycleStatus, 'inactive');
    assert.equal(withArchived.candidates[2]?.record.lifecycleStatus, 'archived');
  });

  it('never returns soft-deleted/archived records when includeArchived is omitted', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'archived-only',
        valueType: 'phone',
        normalizedValue: '6155551111',
        sourceKind: 'contact_phone',
        sourceFieldKey: 'contact_phones',
        sourceFieldLabel: 'Phone',
      },
    ];
    const result = matchProbeAgainstIdentityHits({
      probe: {
        incomingId: 'p',
        drafts: extractIdentityValues(
          snapshot({ recordId: 'p', phones: ['6155551111'] })
        ),
      },
      hits,
      recordsById: new Map([['archived-only', recordSummary('archived-only', 'archived')]]),
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });
    assert.equal(result.candidates.length, 0);
    assert.equal(result.totalCandidateCount, 0);
  });

  it('does not create candidates for first-name-only or generic values', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'rec-1',
        valueType: 'name',
        normalizedValue: 'brenda',
        sourceKind: 'custom_field',
        sourceFieldKey: 'first_name',
        sourceFieldLabel: 'First Name',
      },
      {
        recordId: 'rec-2',
        valueType: 'identity_text',
        normalizedValue: 'residential',
        sourceKind: 'custom_field',
        sourceFieldKey: 'type',
        sourceFieldLabel: 'Type',
      },
    ];
    // Probe also only has weak first name — extractIdentityValues drops it
    const probeDrafts = extractIdentityValues(
      snapshot({
        recordId: 'p',
        customFields: [
          {
            definitionId: 'd',
            valueId: null,
            fieldKey: 'first_name',
            label: 'First Name',
            valueText: 'Brenda',
          },
        ],
      })
    );
    assert.equal(probeDrafts.length, 0);

    const result = matchProbeAgainstIdentityHits({
      probe: { incomingId: 'p', drafts: probeDrafts },
      hits,
      recordsById: new Map([
        ['rec-1', recordSummary('rec-1')],
        ['rec-2', recordSummary('rec-2')],
      ]),
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });
    assert.equal(result.candidates.length, 0);
  });

  it('does not match incomplete phones or similar-but-different emails', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'rec-1',
        valueType: 'phone',
        normalizedValue: '6155551111',
        sourceKind: 'contact_phone',
        sourceFieldKey: 'contact_phones',
        sourceFieldLabel: 'Phone',
      },
      {
        recordId: 'rec-2',
        valueType: 'email',
        normalizedValue: 'brenda@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      },
    ];
    const incompletePhone = extractIdentityValues(
      snapshot({ recordId: 'p1', phones: ['615-555'] })
    );
    assert.equal(incompletePhone.length, 0);

    const differentEmail = matchProbeAgainstIdentityHits({
      probe: {
        incomingId: 'p2',
        drafts: extractIdentityValues(
          snapshot({ recordId: 'p2', emails: ['brenda@example.org'] })
        ),
      },
      hits,
      recordsById: new Map([
        ['rec-1', recordSummary('rec-1')],
        ['rec-2', recordSummary('rec-2')],
      ]),
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });
    assert.equal(differentEmail.candidates.length, 0);
  });

  it('matches full name plus address as high confidence', () => {
    const hits: CrmDuplicateIdentityHit[] = [
      {
        recordId: 'rec-1',
        valueType: 'name',
        normalizedValue: 'brenda smith',
        sourceKind: 'contact_name',
        sourceFieldKey: 'contact_name',
        sourceFieldLabel: 'Contact name',
      },
      {
        recordId: 'rec-1',
        valueType: 'address',
        normalizedValue: '100 main st nashville tn 37201',
        sourceKind: 'project_address',
        sourceFieldKey: 'address',
        sourceFieldLabel: 'Address',
      },
    ];
    const result = matchProbeAgainstIdentityHits({
      probe: {
        incomingId: 'p',
        drafts: extractIdentityValues(
          snapshot({
            recordId: 'p',
            contactName: 'Brenda Smith',
            address: {
              addressLine1: '100 Main St',
              addressLine2: null,
              city: 'Nashville',
              state: 'TN',
              postalCode: '37201',
            },
          })
        ),
      },
      hits,
      recordsById: new Map([['rec-1', recordSummary('rec-1')]]),
      maxCandidates: 10,
      maxEvidenceItems: 20,
    });
    assert.equal(result.candidates[0]?.confidence, 'high');
  });

  it('builds incoming-incoming edges without mirrored pairs and groups A–B–C', () => {
    const probeA: CrmDuplicateProbeDrafts = {
      incomingId: 'A',
      drafts: extractIdentityValues(
        snapshot({ recordId: 'A', phones: ['6155551111'] })
      ),
    };
    const probeB: CrmDuplicateProbeDrafts = {
      incomingId: 'B',
      drafts: extractIdentityValues(
        snapshot({
          recordId: 'B',
          phones: ['(615) 555-1111'],
          emails: ['shared@example.com'],
        })
      ),
    };
    const probeC: CrmDuplicateProbeDrafts = {
      incomingId: 'C',
      drafts: extractIdentityValues(
        snapshot({ recordId: 'C', emails: ['Shared@Example.com'] })
      ),
    };

    const edges = buildIncomingIncomingEdges([probeA, probeB, probeC]);
    // A-B phone, B-C email — no A-C direct, no B-A mirror
    assert.ok(edges.some((e) => e.leftId === 'A' && e.rightId === 'B'));
    assert.ok(edges.some((e) => e.leftId === 'B' && e.rightId === 'C'));
    assert.ok(!edges.some((e) => e.leftId === 'B' && e.rightId === 'A'));

    const grouped = buildDuplicateCandidateGroups({
      probes: [probeA, probeB, probeC],
      perIncomingCandidates: new Map([
        ['A', { candidates: [], truncated: false }],
        ['B', { candidates: [], truncated: false }],
        ['C', { candidates: [], truncated: false }],
      ]),
      incomingEdges: edges,
      maxEvidenceItems: 20,
    });

    assert.equal(grouped.groups.length, 1);
    assert.deepEqual(grouped.groups[0]?.incomingIds, ['A', 'B', 'C']);
    assert.equal(grouped.groups[0]?.confidence, 'high');
  });

  it('respects maxCandidates truncation metadata', () => {
    const hits: CrmDuplicateIdentityHit[] = [];
    const records = new Map<string, ReturnType<typeof recordSummary>>();
    for (let i = 0; i < 5; i += 1) {
      const id = `rec-${i}`;
      hits.push({
        recordId: id,
        valueType: 'email',
        normalizedValue: 'same@example.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      });
      records.set(id, recordSummary(id));
    }
    const result = matchProbeAgainstIdentityHits({
      probe: {
        incomingId: 'p',
        drafts: extractIdentityValues(
          snapshot({ recordId: 'p', emails: ['same@example.com'] })
        ),
      },
      hits,
      recordsById: records,
      maxCandidates: 2,
      maxEvidenceItems: 20,
    });
    assert.equal(result.candidates.length, 2);
    assert.equal(result.totalCandidateCount, 5);
    assert.equal(result.truncated, true);
  });
});
