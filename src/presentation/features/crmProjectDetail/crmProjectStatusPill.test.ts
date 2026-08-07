import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CrmProjectStatus } from '@/domain/crm';
import { canActorChangeCrmProjectStatus, getCrmProjectStatusLabel } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm/projectCompletion';
import type { SetCrmProjectsStatusResult } from '@/domain/crm/setCrmProjectsStatus';
import {
  interpretSetCrmProjectsStatusResult,
  listCrmProjectStatusMenuOptions,
  resolveCrmProjectStatusBadgeTone,
  resolveCrmProjectStatusPillLabel,
} from './crmProjectStatusPill';

function resultItem(
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

describe('crmProjectStatusPill', () => {
  it('renders Active / Completed / Lost / Cancelled labels from shared status', () => {
    const cases: readonly CrmProjectStatus[] = ['active', 'completed', 'lost', 'cancelled'];
    for (const status of cases) {
      assert.equal(resolveCrmProjectStatusPillLabel(status), getCrmProjectStatusLabel(status));
      assert.equal(resolveCrmProjectStatusBadgeTone(status), status);
    }
    assert.equal(resolveCrmProjectStatusPillLabel('active'), 'Active');
    assert.equal(resolveCrmProjectStatusPillLabel('completed'), 'Completed');
    assert.equal(resolveCrmProjectStatusPillLabel('lost'), 'Lost');
    assert.equal(resolveCrmProjectStatusPillLabel('cancelled'), 'Cancelled');
  });

  it('menu lists all four statuses with current selected', () => {
    const options = listCrmProjectStatusMenuOptions('lost');
    assert.deepEqual(
      options.map((option) => option.value),
      ['active', 'completed', 'lost', 'cancelled']
    );
    assert.equal(options.find((option) => option.value === 'lost')?.selected, true);
    assert.equal(options.filter((option) => option.selected).length, 1);
  });

  it('visible complete flag derives from project.status, not legacy completedAt alone', () => {
    assert.equal(
      isCrmProjectComplete({ status: 'active', completedAt: '2020-01-01T00:00:00.000Z' }),
      false
    );
    assert.equal(isCrmProjectComplete({ status: 'completed', completedAt: null }), true);
    assert.equal(isCrmProjectComplete({ status: 'lost', completedAt: null }), false);
    assert.equal(isCrmProjectComplete({ status: 'cancelled', completedAt: null }), false);
  });

  it('interprets unified API success / confirmation / already-at-status', () => {
    assert.equal(
      interpretSetCrmProjectsStatusResult(
        {
          bulkOperationId: 'b1',
          updatedCount: 1,
          results: [
            resultItem({
              slug: 'p1',
              success: true,
              requestedStatus: 'active',
              resultingStatus: 'active',
            }),
          ],
        },
        'p1',
        'failed'
      ).kind,
      'success'
    );

    const confirmation = interpretSetCrmProjectsStatusResult(
      {
        bulkOperationId: 'b2',
        updatedCount: 0,
        results: [
          resultItem({
            slug: 'p1',
            success: false,
            failureCode: 'confirmation_required',
            incompleteTaskCount: 4,
            message: 'warn',
          }),
        ],
      },
      'p1',
      'failed'
    );
    assert.equal(confirmation.kind, 'confirmation_required');
    if (confirmation.kind === 'confirmation_required') {
      assert.equal(confirmation.incompleteTaskCount, 4);
    }

    assert.equal(
      interpretSetCrmProjectsStatusResult(
        {
          bulkOperationId: 'b3',
          updatedCount: 0,
          results: [
            resultItem({
              slug: 'p1',
              success: false,
              failureCode: 'already_at_status',
              requestedStatus: 'active',
              resultingStatus: 'active',
            }),
          ],
        },
        'p1',
        'failed'
      ).kind,
      'noop'
    );
  });

  it('member permission: assigned can change; unassigned / workflow-only cannot', () => {
    assert.equal(
      canActorChangeCrmProjectStatus({
        role: 'member',
        actorUserId: 'barbara',
        assignedMemberId: 'barbara',
      }),
      true
    );
    assert.equal(
      canActorChangeCrmProjectStatus({
        role: 'member',
        actorUserId: 'bob',
        assignedMemberId: 'barbara',
      }),
      false
    );
    assert.equal(
      canActorChangeCrmProjectStatus({
        role: 'member',
        actorUserId: 'bob',
        assignedMemberId: null,
      }),
      false
    );
  });
});
