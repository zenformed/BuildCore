import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canAccessProjectForScope,
  isAssignedOnlyProjectAccess,
  isBuildCoreProjectAccessScope,
  normalizeProjectAssigneeForAccessScope,
} from './projectAccessScope';

describe('project access scopes', () => {
  it('recognizes only the persisted generic scope values', () => {
    assert.equal(isBuildCoreProjectAccessScope('all'), true);
    assert.equal(isBuildCoreProjectAccessScope('assigned_only'), true);
    assert.equal(isBuildCoreProjectAccessScope('sales_rep'), false);
  });

  it('restricts only the explicit assigned-only capability', () => {
    assert.equal(isAssignedOnlyProjectAccess('assigned_only'), true);
    assert.equal(isAssignedOnlyProjectAccess('all'), false);
  });

  it('isolates restricted rep A and B while retaining all-scope administration', () => {
    assert.equal(canAccessProjectForScope({ scope: 'assigned_only', actorUserId: 'rep-a', assignedMemberId: 'rep-a' }), true);
    assert.equal(canAccessProjectForScope({ scope: 'assigned_only', actorUserId: 'rep-a', assignedMemberId: 'rep-b' }), false);
    assert.equal(canAccessProjectForScope({ scope: 'assigned_only', actorUserId: 'rep-b', assignedMemberId: 'rep-a' }), false);
    assert.equal(canAccessProjectForScope({ scope: 'all', actorUserId: 'admin', assignedMemberId: 'rep-a' }), true);
  });

  it('enforces self-assignment on create and update for a restricted user', () => {
    assert.equal(normalizeProjectAssigneeForAccessScope({ scope: 'assigned_only', actorUserId: 'rep-a', requestedAssigneeId: 'rep-b' }), 'rep-a');
    assert.equal(normalizeProjectAssigneeForAccessScope({ scope: 'all', actorUserId: 'admin', requestedAssigneeId: 'rep-b' }), 'rep-b');
  });
});
