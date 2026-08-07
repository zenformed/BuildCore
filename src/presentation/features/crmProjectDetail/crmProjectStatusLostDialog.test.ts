import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_LOSS_REASON_OPTIONS,
  CRM_LOSS_REASON_VALUES,
  validateSetCrmProjectsStatusInput,
} from '@/domain/crm';

/**
 * Lost-reason dialog validation mirrors domain validateSetCrmProjectsStatusInput
 * (MarkInactiveDialog variant="lost" uses CRM_LOSS_REASON_OPTIONS).
 */
describe('Crm project Lost reason dialog (detail status pill)', () => {
  it('exposes the required loss reasons including Other', () => {
    assert.deepEqual(
      CRM_LOSS_REASON_OPTIONS.map((option) => option.value),
      [...CRM_LOSS_REASON_VALUES]
    );
    assert.ok(CRM_LOSS_REASON_OPTIONS.some((option) => option.value === 'other'));
    assert.ok(
      !CRM_LOSS_REASON_OPTIONS.some((option) => (option.value as string) === 'project_canceled')
    );
  });

  it('requires a reason for Lost', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['slug'],
        status: 'lost',
      }),
      'A loss reason is required when status is Lost.'
    );
  });

  it('requires custom text when Other is selected', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['slug'],
        status: 'lost',
        lossReason: 'other',
        lossReasonOther: '   ',
      }),
      'Custom reason is required when Other is selected.'
    );
  });

  it('accepts non-other loss reasons without custom text', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['slug'],
        status: 'lost',
        lossReason: 'chose_competitor',
      }),
      null
    );
  });

  it('Cancelled does not require a loss reason', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['slug'],
        status: 'cancelled',
      }),
      null
    );
  });
});
