import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmBudgetEntry, CrmDocumentMetadata, CrmWorkflowTask } from '@/domain/crm';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
} from './documentPanelModel';

const task: CrmWorkflowTask = {
  id: 'task-1',
  title: 'Permit packet',
  stageSlug: 'permits',
  status: 'pending',
  documentsRequired: true,
  notes: null,
  dueAt: null,
  completedAt: null,
  completedBy: null,
  sortOrder: 0,
  assignedTo: null,
  amountCents: null,
  invoicedAt: null,
  paidAt: null,
  customFields: {},
};

const paymentTask: CrmWorkflowTask = {
  ...task,
  id: 'payment-1',
  title: 'Deposit',
  stageSlug: 'payments',
  amountCents: 50_000,
};

const budgetEntry: CrmBudgetEntry = {
  id: 'budget-1',
  itemName: 'Concrete pour',
  category: 'materials',
  costCents: 10_000,
  budgetCents: 12_000,
  notes: null,
  assignedTo: null,
  costIncurredAt: '2026-01-01T00:00:00.000Z',
  documentCount: 0,
  documentsRequired: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const uploadedBy = {
  id: 'member-1',
  displayName: 'Alex',
  email: 'alex@example.com',
  avatarUrl: null,
  initials: 'A',
};

function makeDocument(
  overrides: Partial<CrmDocumentMetadata> & Pick<CrmDocumentMetadata, 'id'>
): CrmDocumentMetadata {
  return {
    workflowTaskId: null,
    budgetEntryId: null,
    name: 'file.pdf',
    kind: 'other',
    stageSlug: null,
    uploadedAt: '2026-01-02T00:00:00.000Z',
    uploadedBy,
    reviewedAt: null,
    reviewedBy: null,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationSource: null,
    locationCapturedAt: null,
    ...overrides,
  };
}

describe('filterDocumentPanelItems', () => {
  it('includes missing workflow and payment tasks alongside uploaded documents', () => {
    const sources = {
      documents: [
        makeDocument({ id: 'doc-task', workflowTaskId: 'payment-1' }),
      ],
      workflowTasks: [task, paymentTask],
      budgetEntries: [],
    };

    const items = filterDocumentPanelItems(sources, 'all');

    assert.equal(items.filter((item) => item.kind === 'document').length, 1);
    assert.deepEqual(
      items
        .filter((item) => item.kind === 'missing')
        .map((item) => (item.kind === 'missing' ? item.task.id : null)),
      ['task-1']
    );
  });

  it('includes uploaded and missing budget documents', () => {
    const sources = {
      documents: [makeDocument({ id: 'doc-budget', budgetEntryId: 'budget-1', name: 'invoice.pdf' })],
      workflowTasks: [],
      budgetEntries: [
        budgetEntry,
        { ...budgetEntry, id: 'budget-2', itemName: 'Lumber', documentsRequired: true },
      ],
    };

    const allItems = filterDocumentPanelItems(sources, 'all');
    const missingItems = filterDocumentPanelItems(sources, 'missing');
    const uploadedItems = filterDocumentPanelItems(sources, 'uploaded');

    assert.equal(allItems.filter((item) => item.kind === 'document').length, 1);
    assert.deepEqual(
      missingItems
        .filter((item) => item.kind === 'missing_budget')
        .map((item) => (item.kind === 'missing_budget' ? item.entry.id : null)),
      ['budget-2']
    );
    assert.equal(uploadedItems.length, 1);
    assert.equal(
      uploadedItems[0]?.kind === 'document' ? uploadedItems[0].document.budgetEntryId : null,
      'budget-1'
    );
  });

  it('builds sources from project detail payload', () => {
    const sources = buildDocumentPanelSourcesFromProject({
      documents: [],
      workflowTasks: [task],
      budget: {
        entries: [budgetEntry],
        totalCostCents: 0,
        totalBudgetCents: 0,
        remainingCents: 0,
        categoryCosts: [],
      },
    });

    assert.equal(sources.workflowTasks.length, 1);
    assert.equal(sources.budgetEntries.length, 1);
  });
});
