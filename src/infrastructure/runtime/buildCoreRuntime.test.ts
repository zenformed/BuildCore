import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isDemoDeploymentHost,
  isDemoPathname,
  resolveBuildCoreRuntime,
} from '@/infrastructure/runtime/buildCoreRuntime';
import {
  serializeDemoSessionStore,
} from '@/infrastructure/demo/demoSessionStore';
import {
  DemoOperationBlockedError,
} from '@/infrastructure/demo/demoSafetyPolicy';

describe('buildCoreRuntime', () => {
  it('detects demo pathnames', () => {
    assert.equal(isDemoPathname('/demo'), true);
    assert.equal(isDemoPathname('/demo/dashboard'), true);
    assert.equal(isDemoPathname('/dashboard'), false);
  });

  it('detects demo deployment hosts', () => {
    assert.equal(isDemoDeploymentHost('demo.buildcore.zenformed.com'), true);
    assert.equal(isDemoDeploymentHost('buildcore.zenformed.com'), false);
  });

  it('resolves DEMO from pathname', () => {
    assert.equal(resolveBuildCoreRuntime('/demo/dashboard'), 'DEMO');
    assert.equal(resolveBuildCoreRuntime('/dashboard'), 'LIVE');
  });
});

describe('demoSessionStore', () => {
  it('round-trips snapshot serialization', () => {
    const snapshot = serializeDemoSessionStore('session-1', new Map());
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.sessionId, 'session-1');
    assert.deepEqual(snapshot.projectOverrides, {});
    assert.deepEqual(snapshot.archivedSlugs, []);
  });
});

describe('demoSafetyPolicy', () => {
  it('exposes a typed blocked-operation error', () => {
    const error = new DemoOperationBlockedError('crm-direct-upload');
    assert.equal(error.operation, 'crm-direct-upload');
    assert.match(error.message, /interactive demo/i);
  });
});
