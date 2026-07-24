import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertGroupStatusTransition,
  assertJobStatusTransition,
  assertRowStatusTransition,
  CrmImportStatusTransitionError,
} from './spreadsheetImportStatus';

describe('spreadsheetImportStatus', () => {
  it('allows valid job transitions', () => {
    assert.doesNotThrow(() => assertJobStatusTransition('draft', 'ready'));
    assert.doesNotThrow(() => assertJobStatusTransition('ready', 'running'));
    assert.doesNotThrow(() => assertJobStatusTransition('running', 'partially_completed'));
  });

  it('rejects invalid job transitions', () => {
    assert.throws(
      () => assertJobStatusTransition('draft', 'completed'),
      CrmImportStatusTransitionError
    );
  });

  it('allows valid group transitions', () => {
    assert.doesNotThrow(() => assertGroupStatusTransition('unresolved', 'ready'));
    assert.doesNotThrow(() => assertGroupStatusTransition('ready', 'running'));
    assert.doesNotThrow(() => assertGroupStatusTransition('ignored', 'ready'));
    assert.doesNotThrow(() => assertGroupStatusTransition('ignored', 'unresolved'));
  });

  it('allows row transitions through execution lifecycle', () => {
    assert.doesNotThrow(() => assertRowStatusTransition('pending', 'running'));
    assert.doesNotThrow(() => assertRowStatusTransition('running', 'succeeded'));
    assert.doesNotThrow(() => assertRowStatusTransition('pending', 'excluded'));
  });
});
