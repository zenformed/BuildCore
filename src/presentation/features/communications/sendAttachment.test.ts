import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmTeamMemberRef } from '@/domain/crm';
import {
  buildCommunicationRecipientOptions,
  buildCustomerCommunicationRecipientOption,
  buildMemberCommunicationRecipientOption,
} from '@/presentation/features/communications/buildCommunicationRecipientOptions';
import {
  communicationRecipientOptionToSendRecipient,
  defaultCommunicationRecipientId,
} from '@/presentation/features/communications/communicationRecipientTypes';
import {
  isExistingAttachmentSelected,
  isSendAttachmentFormValid,
} from '@/presentation/features/communications/sendAttachmentTypes';
import { mapCrmDocumentToExistingAttachmentOption } from '@/presentation/features/communications/mapExistingAttachmentOptions';
import {
  buildWorkflowTaskSendAttachmentContext,
  workflowTaskSupportsSendAttachment,
} from '@/presentation/features/communications/workflowTaskSendAttachmentAdapter';
import { buildPaymentSendAttachmentContext } from '@/presentation/features/communications/paymentSendAttachmentAdapter';
import { buildBudgetEntrySendAttachmentContext } from '@/presentation/features/communications/budgetEntrySendAttachmentAdapter';
import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';

const project = {
  summary: {
    slug: 'kitchen-remodel',
    name: 'Kitchen Remodel',
    contact: {
      id: 'contact-1',
      name: 'Jane Customer',
      email: 'jane@example.com',
    },
  },
} as CrmProjectDetail;

const task = {
  id: 'task-1',
  title: 'Send contract',
} as CrmWorkflowTask;

const payment = {
  id: 'payment-1',
  title: 'Deposit',
  amountCents: 250000,
} as CrmWorkflowTask;

const budgetEntry = {
  id: 'budget-1',
  itemName: 'Drywall materials',
  category: 'materials',
} as CrmBudgetEntry;

const document = {
  id: 'doc-1',
  workflowTaskId: 'task-1',
  budgetEntryId: null,
  name: 'contract.pdf',
  kind: 'contract',
  stageSlug: null,
  uploadedAt: '2026-01-15T12:00:00.000Z',
  uploadedBy: { id: 'member-1', displayName: 'Staff', initials: 'ST', email: null },
  reviewedAt: null,
  reviewedBy: null,
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  latitude: null,
  longitude: null,
  locationAccuracyMeters: null,
  locationSource: null,
  locationCapturedAt: null,
} as CrmDocumentMetadata;

const member: CrmTeamMemberRef = {
  id: 'user-2',
  displayName: 'Daniel Henderson',
  initials: 'DH',
  avatarUrl: '/api/auth/user-avatar/user-2',
  email: 'daniel@company.com',
};

const catalog = {
  byUserId: new Map([[member.id, member]]),
  byEmail: new Map([[member.email!.toLowerCase(), member]]),
  assignableMembers: [member],
};

describe('buildCommunicationRecipientOptions', () => {
  it('places customer first and deduplicates member email matches', () => {
    const options = buildCommunicationRecipientOptions({
      customer: project.summary.contact,
      members: [member, { ...member, id: 'user-duplicate' }],
    });
    assert.equal(options.length, 2);
    assert.equal(options[0]?.type, 'customer');
    assert.equal(options[0]?.email, 'jane@example.com');
    assert.equal(options[1]?.type, 'member');
    assert.equal(options[1]?.email, 'daniel@company.com');
  });

  it('maps customer and member options to send payload fields', () => {
    const customer = buildCustomerCommunicationRecipientOption(project.summary.contact);
    const teamMember = buildMemberCommunicationRecipientOption(member);
    assert.ok(customer);
    assert.ok(teamMember);
    assert.deepEqual(communicationRecipientOptionToSendRecipient(customer), {
      email: 'jane@example.com',
      name: 'Jane Customer',
      contactId: 'contact-1',
      memberId: null,
    });
    assert.deepEqual(communicationRecipientOptionToSendRecipient(teamMember), {
      email: 'daniel@company.com',
      name: 'Daniel Henderson',
      contactId: null,
      memberId: 'user-2',
    });
  });

  it('defaults to customer recipient when available', () => {
    const options = buildCommunicationRecipientOptions({
      customer: project.summary.contact,
      members: [member],
    });
    assert.equal(defaultCommunicationRecipientId(options), 'customer:contact-1');
  });
});

describe('isSendAttachmentFormValid', () => {
  it('requires recipient email and subject plus message or attachment', () => {
    assert.equal(
      isSendAttachmentFormValid({
        recipientEmail: 'jane@example.com',
        subject: 'Documents',
        message: '',
        selectedAttachments: [],
      }),
      false
    );
    assert.equal(
      isSendAttachmentFormValid({
        recipientEmail: 'jane@example.com',
        subject: 'Documents',
        message: 'Please review.',
        selectedAttachments: [],
      }),
      true
    );
    assert.equal(
      isSendAttachmentFormValid({
        recipientEmail: 'jane@example.com',
        subject: 'Documents',
        message: '',
        selectedAttachments: [
          {
            id: 'existing-doc-1',
            source: 'existing',
            crmDocumentId: 'doc-1',
            fileName: 'contract.pdf',
            mimeType: 'application/pdf',
            kind: 'contract',
            sizeBytes: 2048,
          },
        ],
      }),
      true
    );
  });
});

describe('existing attachment selection', () => {
  it('detects duplicate existing document selection', () => {
    const selected = [
      {
        id: 'existing-doc-1',
        source: 'existing' as const,
        crmDocumentId: 'doc-1',
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        kind: 'contract',
        sizeBytes: 2048,
      },
    ];
    assert.equal(isExistingAttachmentSelected(selected, 'doc-1'), true);
    assert.equal(isExistingAttachmentSelected(selected, 'doc-2'), false);
  });

  it('maps CRM documents to existing attachment options', () => {
    const mapped = mapCrmDocumentToExistingAttachmentOption(document);
    assert.equal(mapped.crmDocumentId, 'doc-1');
    assert.equal(mapped.fileName, 'contract.pdf');
    assert.equal(mapped.kind, 'contract');
  });
});

describe('workflowTaskSendAttachmentAdapter', () => {
  it('supports send attachment when project customer email exists', () => {
    assert.equal(workflowTaskSupportsSendAttachment(project, true), true);
    assert.equal(workflowTaskSupportsSendAttachment(project, false), false);
  });

  it('builds dialog context with customer default and organization members', () => {
    const context = buildWorkflowTaskSendAttachmentContext(project, task, [document], catalog);
    assert.ok(context);
    assert.equal(context!.defaultRecipientId, 'customer:contact-1');
    assert.equal(context!.recipientOptions.length, 2);
    assert.equal(context!.entity.type, 'workflow_task');
    assert.equal(context!.existingDocuments.length, 1);
  });
});

describe('paymentSendAttachmentAdapter', () => {
  it('builds payment communication context with workflow_task upload scope', () => {
    const context = buildPaymentSendAttachmentContext(project, payment, [document], catalog);
    assert.ok(context);
    assert.equal(context!.entity.type, 'payment');
    assert.equal(context!.entity.id, 'payment-1');
    assert.equal(context!.defaultSubject, 'Payment documents for Kitchen Remodel');
    assert.equal(context!.context.entityLabel, 'Payment: Deposit');
    assert.equal(context!.uploadScope.scope, 'workflow_task');
    assert.equal(context!.uploadScope.workflowTaskId, 'payment-1');
  });
});

describe('budgetEntrySendAttachmentAdapter', () => {
  it('builds budget communication context with budget_entry upload scope', () => {
    const context = buildBudgetEntrySendAttachmentContext(
      project,
      budgetEntry,
      [document],
      catalog
    );
    assert.ok(context);
    assert.equal(context!.entity.type, 'budget_entry');
    assert.equal(context!.entity.id, 'budget-1');
    assert.equal(context!.defaultSubject, 'Budget documents for Kitchen Remodel');
    assert.equal(context!.context.entityLabel, 'Budget: Drywall materials');
    assert.equal(context!.uploadScope.scope, 'budget_entry');
    assert.equal(context!.uploadScope.budgetEntryId, 'budget-1');
  });
});
