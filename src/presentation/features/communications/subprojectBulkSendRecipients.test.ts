import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmProjectSummary } from '@/domain/crm';
import {
  orderBulkSendCompletionRows,
  summarizeBulkSendDeliveryRows,
  type BulkSendDeliveryRow,
} from '@/presentation/features/communications/bulkSendCommunication';
import {
  buildBulkSubprojectSendDefaultSubject,
  resolveBulkSubprojectSendRecipients,
} from '@/presentation/features/communications/subprojectBulkSendRecipients';

function buildSubproject(overrides: Partial<CrmProjectSummary> & { id: string; name: string }): CrmProjectSummary {
  return {
    slug: overrides.id,
    parentProjectId: 'parent-1',
    stageId: 'stage-1',
    contact: {
      id: 'contact-1',
      name: 'Jane Customer',
      email: 'jane@example.com',
      phone: '',
      title: null,
    },
    ...overrides,
  } as CrmProjectSummary;
}

describe('resolveBulkSubprojectSendRecipients', () => {
  it('marks recipients with email as ready and missing email as skipped', () => {
    const summary = resolveBulkSubprojectSendRecipients([
      buildSubproject({
        id: 'sub-1',
        name: 'North wing',
        contact: { id: 'c1', name: 'Alice', email: 'alice@example.com', phone: '', title: null },
      }),
      buildSubproject({
        id: 'sub-2',
        name: 'South wing',
        contact: { id: 'c2', name: 'Bob', email: '   ', phone: '', title: null },
      }),
      buildSubproject({
        id: 'sub-3',
        name: 'Garage',
        contact: { id: 'c3', name: 'Carol', email: 'carol@example.com', phone: '', title: null },
      }),
    ]);

    assert.equal(summary.selectedCount, 3);
    assert.equal(summary.readyCount, 2);
    assert.equal(summary.skippedCount, 1);
    assert.equal(summary.recipients[0]?.status, 'ready');
    assert.equal(summary.recipients[0]?.email, 'alice@example.com');
    assert.equal(summary.recipients[1]?.status, 'missing_email');
    assert.equal(summary.recipients[1]?.email, null);
  });

  it('uses fallback contact name when empty', () => {
    const summary = resolveBulkSubprojectSendRecipients([
      buildSubproject({
        id: 'sub-1',
        name: 'Unit A',
        contact: { id: 'c1', name: '   ', email: 'a@example.com', phone: '', title: null },
      }),
    ]);

    assert.equal(summary.recipients[0]?.contactName, 'Customer');
  });
});

describe('buildBulkSubprojectSendDefaultSubject', () => {
  it('includes parent project name', () => {
    assert.equal(
      buildBulkSubprojectSendDefaultSubject('Kitchen Remodel'),
      'Documents for Kitchen Remodel subprojects'
    );
  });
});

describe('orderBulkSendCompletionRows', () => {
  it('preserves recipient selection order and merges delivery status', () => {
    const recipients = resolveBulkSubprojectSendRecipients([
      buildSubproject({ id: 'sub-1', name: 'North', contact: { id: 'c1', name: 'Alice', email: 'a@example.com', phone: '', title: null } }),
      buildSubproject({ id: 'sub-2', name: 'South', contact: { id: 'c2', name: 'Bob', email: '', phone: '', title: null } }),
    ]).recipients;

    const deliveryRows: BulkSendDeliveryRow[] = [
      { ...recipients[0]!, deliveryStatus: 'sent' },
      { ...recipients[1]!, deliveryStatus: 'skipped' },
    ];

    const ordered = orderBulkSendCompletionRows(recipients, deliveryRows);
    assert.equal(ordered[0]?.subprojectName, 'North');
    assert.equal(ordered[0]?.deliveryStatus, 'sent');
    assert.equal(ordered[1]?.deliveryStatus, 'skipped');
  });
});

describe('summarizeBulkSendDeliveryRows', () => {
  it('counts sent, failed, and skipped rows', () => {
    const summary = resolveBulkSubprojectSendRecipients([
      buildSubproject({ id: 'sub-1', name: 'A', contact: { id: 'c1', name: 'Alice', email: 'a@example.com', phone: '', title: null } }),
      buildSubproject({ id: 'sub-2', name: 'B', contact: { id: 'c2', name: 'Bob', email: 'b@example.com', phone: '', title: null } }),
      buildSubproject({ id: 'sub-3', name: 'C', contact: { id: 'c3', name: 'Carol', email: '', phone: '', title: null } }),
    ]);

    const rows: BulkSendDeliveryRow[] = [
      { ...summary.recipients[0]!, deliveryStatus: 'sent' },
      { ...summary.recipients[1]!, deliveryStatus: 'failed', errorMessage: 'Could not send the email.' },
      { ...summary.recipients[2]!, deliveryStatus: 'skipped' },
    ];

    assert.deepEqual(summarizeBulkSendDeliveryRows(rows), {
      sentCount: 1,
      failedCount: 1,
      skippedCount: 1,
    });
  });
});
