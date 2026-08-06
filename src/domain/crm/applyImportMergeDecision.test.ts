import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMergeIntoUpdateInput,
  buildReplaceUpdateInput,
  crmProjectDetailToUpdateInput,
} from '@/domain/crm/applyImportMergeDecision';
import type { CrmProjectDetail } from '@/domain/crm/project';
import type { CrmDuplicateCandidate } from '@/domain/crm/identity';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';
import type { ImportMergeGroupDecision } from '@/domain/crm/importMergeReview';

function detail(overrides: Partial<CrmProjectDetail['summary']> = {}): CrmProjectDetail {
  return {
    summary: {
      id: 'p1',
      slug: 'd3sub',
      parentProjectId: 'parent',
      name: 'D3sub',
      industry: 'hvac',
      customIndustry: null,
      contact: {
        id: 'c1',
        name: 'D3sub',
        email: '',
        phone: '(206) 579-8050',
        emails: [],
        phones: ['(206) 579-8050'],
        title: null,
      },
      client: { id: 'cl1', name: 'D3sub', segment: null },
      address: {
        addressLine1: '1 Main',
        addressLine2: null,
        city: 'Seattle',
        state: 'WA',
        postalCode: '98101',
      },
      priority: 'normal',
      currentStageSlug: 'call-1',
      notesPreview: null,
      dealValueCents: 0,
      balanceRemainingCents: 0,
      assignedTo: null,
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      completedAt: null,
      completedBy: null,
      primaryPhotoPath: null,
      latitude: null,
      longitude: null,
      leadToken: 'tok',
      status: 'active',
      lossReason: null,
      lossReasonOther: null,
      statusChangedAt: null,
      statusChangedBy: null,
      customFields: {},
      ...overrides,
    },
    notes: 'old notes',
    stageProgress: { currentStageSlug: 'call-1', completedStageSlugs: [] },
    workflowTasks: [],
    manualStageCompletions: [],
    documents: [],
    accountabilityLog: [],
    milestonePayment: {
      contractValueCents: 0,
      invoicedCents: 0,
      paidCents: 0,
      balanceCents: 0,
      milestones: [],
    },
    budget: {
      entries: [],
      totalCostCents: 0,
      totalBudgetCents: 0,
      remainingCents: 0,
      categoryCosts: [],
    },
  };
}

function candidate(): CrmDuplicateCandidate {
  return {
    record: {
      id: 'p1',
      slug: 'd3sub',
      recordType: 'subproject',
      name: 'D3sub',
      parentProjectId: 'parent',
      parentProjectSlug: 'd3',
      parentProjectName: 'D3',
      contactName: 'D3sub',
      emails: [],
      phones: ['(206) 579-8050'],
      addressLine: '1 Main, Seattle, WA 98101',
      notes: 'old notes',
      photoCount: 0,
      documentCount: 0,
      customFields: [],
      stageSlug: 'call-1',
      stageLabel: 'Call 1',
      lifecycleStatus: 'active',
      subprojectStatus: 'active',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    confidence: 'high',
    score: 100,
    evidence: [],
  };
}

function item(): ImportDuplicateReviewItem {
  return {
    incomingId: 'row:1',
    sourceRowIndex: 1,
    displayRowNumber: 2,
    name: 'Antoinette Reese',
    contactName: 'Antoinette Reese',
    email: 'a@example.com',
    phone: '(253) 217-8655',
    emails: ['a@example.com'],
    phones: ['(253) 217-8655'],
    addressLine: '9 Oak Ave',
    stage: 'intake',
    notes: 'imported notes',
    customFields: [],
    existingCandidates: [candidate()],
    peerIncoming: [],
  };
}

describe('applyImportMergeDecision', () => {
  it('replaces identity fields from the imported row', () => {
    const update = buildReplaceUpdateInput({
      detail: detail(),
      item: item(),
      candidate: candidate(),
    });
    assert.equal(update.name, 'Antoinette Reese');
    assert.equal(update.contactName, 'Antoinette Reese');
    assert.deepEqual(update.phones, ['(253) 217-8655']);
    assert.deepEqual(update.emails, ['a@example.com']);
    assert.equal(update.notes, 'imported notes');
    assert.equal(update.addressLine1, '9 Oak Ave');
    assert.equal(update.currentStageSlug, 'intake');
  });

  it('merges using field actions including use imported contact', () => {
    const decision: ImportMergeGroupDecision = {
      incomingId: 'row:1',
      matchedRecordId: 'p1',
      recordAction: 'merge_into_existing',
      replaceConfirmed: false,
      showIdenticalFields: false,
      showAllCustomFields: false,
      fields: [
        {
          kind: 'scalar',
          fieldKey: 'contact',
          label: 'Contact',
          existingValue: 'D3sub',
          importedValue: 'Antoinette Reese',
          action: 'use_imported',
          requiresDecision: false,
        },
        {
          kind: 'scalar',
          fieldKey: 'name',
          label: 'Name',
          existingValue: 'D3sub',
          importedValue: 'Antoinette Reese',
          action: 'keep_existing',
          requiresDecision: false,
        },
      ],
    };
    const update = buildMergeIntoUpdateInput({
      detail: detail(),
      item: item(),
      candidate: candidate(),
      decision,
    });
    assert.equal(update.contactName, 'Antoinette Reese');
    assert.equal(update.name, 'D3sub');
  });

  it('preserves unmapped detail fields when converting to update input', () => {
    const update = crmProjectDetailToUpdateInput(detail());
    assert.equal(update.industry, 'hvac');
    assert.equal(update.priority, 'normal');
    assert.equal(update.city, 'Seattle');
  });
});
