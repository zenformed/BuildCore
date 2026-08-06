import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveCrmProjectStatusFieldsFromDb,
  toProjectStatusWriteFieldsFromLegacyInactive,
} from './projectStatus';

describe('resolveCrmProjectStatusFieldsFromDb', () => {
  it('prefers project_status columns when present', () => {
    const resolved = resolveCrmProjectStatusFieldsFromDb({
      projectStatus: 'lost',
      lossReason: 'dead_lead',
      lossReasonOther: null,
      statusChangedAt: '2026-01-02T00:00:00.000Z',
      legacySubprojectStatus: 'normal',
      legacyInactiveReason: null,
      legacyInactiveReasonCustom: null,
      legacyInactiveAt: null,
      priority: 'normal',
      completedAt: null,
    });
    assert.deepEqual(resolved, {
      status: 'lost',
      lossReason: 'dead_lead',
      lossReasonOther: null,
      statusChangedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('falls back to legacy inactive + project_canceled → cancelled', () => {
    const resolved = resolveCrmProjectStatusFieldsFromDb({
      projectStatus: null,
      legacySubprojectStatus: 'inactive',
      legacyInactiveReason: 'project_canceled',
      legacyInactiveReasonCustom: null,
      legacyInactiveAt: '2026-01-01T00:00:00.000Z',
      priority: 'urgent',
      completedAt: null,
    });
    assert.equal(resolved.status, 'cancelled');
    assert.equal(resolved.lossReason, null);
  });

  it('falls back to legacy inactive with null reason → lost/other with preserved marker', () => {
    const resolved = resolveCrmProjectStatusFieldsFromDb({
      projectStatus: null,
      legacySubprojectStatus: 'inactive',
      legacyInactiveReason: null,
      legacyInactiveReasonCustom: null,
      legacyInactiveAt: '2026-01-01T00:00:00.000Z',
      priority: 'normal',
      completedAt: null,
    });
    assert.equal(resolved.status, 'lost');
    assert.equal(resolved.lossReason, 'other');
    assert.equal(resolved.lossReasonOther, '[legacy] missing inactive_reason');
  });

  it('maps completed_at to completed when project_status absent', () => {
    const resolved = resolveCrmProjectStatusFieldsFromDb({
      projectStatus: null,
      legacySubprojectStatus: 'normal',
      legacyInactiveReason: null,
      legacyInactiveReasonCustom: null,
      legacyInactiveAt: null,
      priority: 'normal',
      completedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(resolved.status, 'completed');
  });
});

describe('toProjectStatusWriteFieldsFromLegacyInactive', () => {
  it('maps project_canceled to cancelled without loss reason', () => {
    const write = toProjectStatusWriteFieldsFromLegacyInactive({
      reason: 'project_canceled',
      changedAt: '2026-01-01T00:00:00.000Z',
      changedBy: 'user-1',
    });
    assert.equal(write.project_status, 'cancelled');
    assert.equal(write.loss_reason, null);
  });

  it('maps other to lost with custom text', () => {
    const write = toProjectStatusWriteFieldsFromLegacyInactive({
      reason: 'other',
      customReason: 'Custom note',
      changedAt: '2026-01-01T00:00:00.000Z',
      changedBy: 'user-1',
    });
    assert.deepEqual(write, {
      project_status: 'lost',
      loss_reason: 'other',
      loss_reason_other: 'Custom note',
      status_changed_at: '2026-01-01T00:00:00.000Z',
      status_changed_by: 'user-1',
    });
  });
});
