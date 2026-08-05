import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSpreadsheetImportCompletedIdempotencyKey,
  shouldNotifySpreadsheetImportCompleted,
} from '@/domain/crm/spreadsheetImportCompletedNotification';

describe('spreadsheetImportCompletedNotification', () => {
  it('only notifies when completed and transitioning to terminal', () => {
    assert.equal(
      shouldNotifySpreadsheetImportCompleted({
        recipientUserId: 'user-1',
        status: 'completed',
        transitionedToTerminal: true,
      }),
      true
    );
    assert.equal(
      shouldNotifySpreadsheetImportCompleted({
        recipientUserId: 'user-1',
        status: 'completed',
        transitionedToTerminal: false,
      }),
      false
    );
    assert.equal(
      shouldNotifySpreadsheetImportCompleted({
        recipientUserId: 'user-1',
        status: 'partially_completed',
        transitionedToTerminal: true,
      }),
      false
    );
  });

  it('builds a deterministic idempotency key', () => {
    const first = buildSpreadsheetImportCompletedIdempotencyKey({
      jobId: 'job-1',
      recipientUserId: 'user-1',
      status: 'completed',
    });
    const second = buildSpreadsheetImportCompletedIdempotencyKey({
      jobId: 'job-1',
      recipientUserId: 'user-1',
      status: 'completed',
    });
    assert.equal(first, second);
  });
});
