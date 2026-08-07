import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmProjectStatusDualWritePatch,
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

describe('buildCrmProjectStatusDualWritePatch', () => {
  const base = {
    priority: 'normal' as const,
    changedAt: '2026-03-01T12:00:00.000Z',
    changedBy: 'actor-1',
  };

  it('writes Active and clears loss + completion fields', () => {
    const patch = buildCrmProjectStatusDualWritePatch({
      ...base,
      status: 'active',
      lossReason: null,
      lossReasonOther: null,
    });
    assert.equal(patch.project_status, 'active');
    assert.equal(patch.loss_reason, null);
    assert.equal(patch.loss_reason_other, null);
    assert.equal(patch.subproject_status, 'normal');
    assert.equal(patch.inactive_reason, null);
    assert.equal(patch.inactive_at, null);
    assert.equal(patch.completed_at, null);
    assert.equal(patch.completed_by, null);
  });

  it('Active → Lost clears completed_at/completed_by and keeps new+legacy synced', () => {
    const patch = buildCrmProjectStatusDualWritePatch({
      ...base,
      status: 'lost',
      lossReason: 'price',
      lossReasonOther: null,
    });
    assert.equal(patch.project_status, 'lost');
    assert.equal(patch.loss_reason, 'price');
    assert.equal(patch.loss_reason_other, null);
    assert.equal(patch.subproject_status, 'inactive');
    assert.equal(patch.inactive_reason, 'price');
    assert.equal(patch.inactive_at, base.changedAt);
    assert.equal(patch.inactive_by, base.changedBy);
    assert.equal(patch.completed_at, null);
    assert.equal(patch.completed_by, null);
  });

  it('maps dead_lead Lost to legacy other + Dead lead custom', () => {
    const patch = buildCrmProjectStatusDualWritePatch({
      ...base,
      status: 'lost',
      lossReason: 'dead_lead',
      lossReasonOther: null,
    });
    assert.equal(patch.project_status, 'lost');
    assert.equal(patch.loss_reason, 'dead_lead');
    assert.equal(patch.inactive_reason, 'other');
    assert.equal(patch.inactive_reason_custom, 'Dead lead');
    assert.equal(patch.completed_at, null);
    assert.equal(patch.completed_by, null);
  });

  it('Active → Cancelled clears completed_at/completed_by and keeps new+legacy synced', () => {
    const patch = buildCrmProjectStatusDualWritePatch({
      ...base,
      status: 'cancelled',
      lossReason: null,
      lossReasonOther: null,
    });
    assert.equal(patch.project_status, 'cancelled');
    assert.equal(patch.loss_reason, null);
    assert.equal(patch.loss_reason_other, null);
    assert.equal(patch.subproject_status, 'inactive');
    assert.equal(patch.inactive_reason, 'project_canceled');
    assert.equal(patch.inactive_reason_custom, null);
    assert.equal(patch.completed_at, null);
    assert.equal(patch.completed_by, null);
  });

  it('writes Completed with completion side-effect columns', () => {
    const patch = buildCrmProjectStatusDualWritePatch({
      ...base,
      status: 'completed',
      lossReason: null,
      lossReasonOther: null,
      completionExtras: {
        priority: 'low',
        currentStageSlug: 'complete',
      },
    });
    assert.equal(patch.project_status, 'completed');
    assert.equal(patch.subproject_status, 'completed');
    assert.equal(patch.completed_at, base.changedAt);
    assert.equal(patch.completed_by, base.changedBy);
    assert.equal(patch.priority, 'low');
    assert.equal(patch.current_stage_slug, 'complete');
    assert.equal(patch.loss_reason, null);
    assert.equal(patch.inactive_reason, null);
  });
});
