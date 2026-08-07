import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canActorChangeCrmProjectStatus } from './projectStatusAccess';

describe('canActorChangeCrmProjectStatus', () => {
  it('allows owner/admin/coordinator for any assignment', () => {
    for (const role of ['owner', 'admin', 'coordinator'] as const) {
      assert.equal(
        canActorChangeCrmProjectStatus({
          role,
          actorUserId: 'user-a',
          assignedMemberId: null,
        }),
        true
      );
      assert.equal(
        canActorChangeCrmProjectStatus({
          role,
          actorUserId: 'user-a',
          assignedMemberId: 'user-b',
        }),
        true
      );
    }
  });

  it('allows member when directly assigned to the project/subproject', () => {
    assert.equal(
      canActorChangeCrmProjectStatus({
        role: 'member',
        actorUserId: 'barbara',
        assignedMemberId: 'barbara',
      }),
      true
    );
  });

  it('denies member when not assigned on the project row', () => {
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

  it('ignores workflow task assignment (helper has no task-assignee input)', () => {
    // Bob is a workflow-task assignee only — project assigned_member_id is Barbara.
    // Permission must evaluate only the project row assignee.
    assert.equal(
      canActorChangeCrmProjectStatus({
        role: 'member',
        actorUserId: 'bob',
        assignedMemberId: 'barbara',
      }),
      false
    );
  });
});
