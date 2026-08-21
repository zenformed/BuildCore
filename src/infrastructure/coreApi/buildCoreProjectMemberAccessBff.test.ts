import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBuildCoreProjectMemberAccessJson } from './buildCoreProjectMemberAccessBff';

describe('project member access BFF response parser', () => {
  it('accepts authoritative effective member scopes', () => {
    assert.deepEqual(parseBuildCoreProjectMemberAccessJson({
      entries: [
        { userId: 'owner', projectAccessScope: 'all' },
        { userId: 'rep', projectAccessScope: 'assigned_only' },
      ],
    }), [
      { userId: 'owner', projectAccessScope: 'all' },
      { userId: 'rep', projectAccessScope: 'assigned_only' },
    ]);
  });

  it('rejects an invalid scope rather than exposing an untrusted value to the UI', () => {
    assert.equal(parseBuildCoreProjectMemberAccessJson({
      entries: [{ userId: 'rep', projectAccessScope: 'other' }],
    }), null);
  });
});
