import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertCrmApiAvailableForRuntime,
  CrmApiError,
} from './crmApiClient';

describe('CRM API runtime safety boundary', () => {
  it('allows production CRM API adapters outside demo runtime', () => {
    assert.doesNotThrow(() => assertCrmApiAvailableForRuntime(false, 'api'));
  });

  it('blocks every authenticated CRM API adapter in demo runtime', () => {
    assert.throws(
      () => assertCrmApiAvailableForRuntime(true, 'api'),
      (error: unknown) =>
        error instanceof CrmApiError &&
        error.code === 'demo_runtime_blocked' &&
        error.status === 403
    );
  });

  it('blocks production CRM APIs whenever the mock source is active', () => {
    assert.throws(
      () => assertCrmApiAvailableForRuntime(false, 'mock'),
      (error: unknown) =>
        error instanceof CrmApiError &&
        error.code === 'crm_api_source_blocked' &&
        error.status === 403
    );
  });
});
