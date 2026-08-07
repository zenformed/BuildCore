import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatBulkCrmProjectStatusSuccessMessage,
  interpretBulkSetCrmProjectsStatusResult,
} from './crmProjectBulkStatus';
import type { SetCrmProjectsStatusResult } from '@/domain/crm/setCrmProjectsStatus';

function result(
  overrides: Partial<SetCrmProjectsStatusResult['results'][number]> & { readonly slug: string }
): SetCrmProjectsStatusResult['results'][number] {
  return {
    success: false,
    previousStatus: 'active',
    requestedStatus: 'completed',
    resultingStatus: null,
    failureCode: null,
    message: null,
    ...overrides,
  };
}

describe('interpretBulkSetCrmProjectsStatusResult', () => {
  it('aggregates confirmation_required without treating it as failure', () => {
    const outcome = interpretBulkSetCrmProjectsStatusResult(
      {
        bulkOperationId: 'b1',
        updatedCount: 0,
        results: [
          result({
            slug: 'a',
            failureCode: 'confirmation_required',
            incompleteTaskCount: 2,
          }),
          result({
            slug: 'b',
            failureCode: 'confirmation_required',
            incompleteTaskCount: 3,
          }),
        ],
      },
      'completed',
      'failed'
    );
    assert.equal(outcome.kind, 'confirmation_required');
    if (outcome.kind === 'confirmation_required') {
      assert.equal(outcome.incompleteTaskCount, 5);
      assert.equal(outcome.pendingSlugCount, 2);
    }
  });

  it('reports success for unified bulk update', () => {
    const outcome = interpretBulkSetCrmProjectsStatusResult(
      {
        bulkOperationId: 'b2',
        updatedCount: 2,
        results: [
          result({ slug: 'a', success: true, resultingStatus: 'active', requestedStatus: 'active' }),
          result({ slug: 'b', success: true, resultingStatus: 'active', requestedStatus: 'active' }),
        ],
      },
      'active',
      'failed'
    );
    assert.equal(outcome.kind, 'success');
    if (outcome.kind === 'success') {
      assert.equal(outcome.updatedCount, 2);
    }
  });

  it('formats bulk success copy', () => {
    assert.equal(
      formatBulkCrmProjectStatusSuccessMessage('lost', 3, {
        success: (label) => `one ${label}`,
        bulkSuccess: (label, count) => `${count} to ${label}`,
      }),
      '3 to Lost'
    );
  });
});
