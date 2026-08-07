import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_PROJECTS_STATUS_BULK_MAX_IDS,
  isCrmProjectStatusAlreadyAtTarget,
  parseSetCrmProjectsStatusBody,
  validateSetCrmProjectsStatusRequest,
} from './setCrmProjectsStatus';
import { validateSetCrmProjectsStatusInput } from './projectStatus';

describe('validateSetCrmProjectsStatusInput', () => {
  it('rejects empty project list', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: [],
        status: 'active',
      }),
      'At least one project is required.'
    );
  });

  it('requires loss reason for Lost', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['a'],
        status: 'lost',
        lossReason: null,
      }),
      'A loss reason is required when status is Lost.'
    );
  });

  it('requires custom text when loss reason is other', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['a'],
        status: 'lost',
        lossReason: 'other',
        lossReasonOther: '  ',
      }),
      'Custom reason is required when Other is selected.'
    );
  });

  it('accepts Lost with valid non-other reason', () => {
    assert.equal(
      validateSetCrmProjectsStatusInput({
        projectSlugs: ['a'],
        status: 'lost',
        lossReason: 'price',
      }),
      null
    );
  });
});

describe('validateSetCrmProjectsStatusRequest', () => {
  it(`rejects more than ${CRM_PROJECTS_STATUS_BULK_MAX_IDS} slugs`, () => {
    const slugs = Array.from({ length: CRM_PROJECTS_STATUS_BULK_MAX_IDS + 1 }, (_, i) => `p-${i}`);
    assert.equal(
      validateSetCrmProjectsStatusRequest({
        projectSlugs: slugs,
        status: 'active',
      }),
      `Select at most ${CRM_PROJECTS_STATUS_BULK_MAX_IDS} projects.`
    );
  });

  it(`accepts up to ${CRM_PROJECTS_STATUS_BULK_MAX_IDS} slugs`, () => {
    const slugs = Array.from({ length: CRM_PROJECTS_STATUS_BULK_MAX_IDS }, (_, i) => `p-${i}`);
    assert.equal(
      validateSetCrmProjectsStatusRequest({
        projectSlugs: slugs,
        status: 'cancelled',
      }),
      null
    );
  });
});

describe('isCrmProjectStatusAlreadyAtTarget', () => {
  it('treats same non-lost status as no-op', () => {
    assert.equal(
      isCrmProjectStatusAlreadyAtTarget({
        currentStatus: 'active',
        currentLossReason: null,
        currentLossReasonOther: null,
        requestedStatus: 'active',
        requestedLossReason: null,
        requestedLossReasonOther: null,
      }),
      true
    );
  });

  it('treats Lost with same reason data as no-op', () => {
    assert.equal(
      isCrmProjectStatusAlreadyAtTarget({
        currentStatus: 'lost',
        currentLossReason: 'other',
        currentLossReasonOther: 'Custom',
        requestedStatus: 'lost',
        requestedLossReason: 'other',
        requestedLossReasonOther: 'Custom',
      }),
      true
    );
  });

  it('treats Lost reason change as a real update', () => {
    assert.equal(
      isCrmProjectStatusAlreadyAtTarget({
        currentStatus: 'lost',
        currentLossReason: 'price',
        currentLossReasonOther: null,
        requestedStatus: 'lost',
        requestedLossReason: 'no_response',
        requestedLossReasonOther: null,
      }),
      false
    );
  });

  it('treats Lost other-text change as a real update', () => {
    assert.equal(
      isCrmProjectStatusAlreadyAtTarget({
        currentStatus: 'lost',
        currentLossReason: 'other',
        currentLossReasonOther: 'A',
        requestedStatus: 'lost',
        requestedLossReason: 'other',
        requestedLossReasonOther: 'B',
      }),
      false
    );
  });
});

describe('parseSetCrmProjectsStatusBody', () => {
  it('parses a valid status request', () => {
    assert.deepEqual(
      parseSetCrmProjectsStatusBody({
        projectSlugs: ['a', 'b'],
        status: 'lost',
        lossReason: 'dead_lead',
        lossReasonOther: null,
        source: 'table_bulk',
      }),
      {
        projectSlugs: ['a', 'b'],
        status: 'lost',
        lossReason: 'dead_lead',
        lossReasonOther: null,
        source: 'table_bulk',
        confirmIncompleteTasks: null,
      }
    );
  });

  it('rejects invalid status', () => {
    assert.equal(
      parseSetCrmProjectsStatusBody({
        projectSlugs: ['a'],
        status: 'inactive',
      }),
      null
    );
  });

  it('rejects invalid source', () => {
    assert.equal(
      parseSetCrmProjectsStatusBody({
        projectSlugs: ['a'],
        status: 'active',
        source: 'unknown',
      }),
      null
    );
  });

  it('parses confirmIncompleteTasks', () => {
    assert.deepEqual(
      parseSetCrmProjectsStatusBody({
        projectSlugs: ['a'],
        status: 'completed',
        confirmIncompleteTasks: true,
      }),
      {
        projectSlugs: ['a'],
        status: 'completed',
        lossReason: null,
        lossReasonOther: null,
        source: null,
        confirmIncompleteTasks: true,
      }
    );
  });
});
