import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldUseProductionCrmListV2 } from './crmDataSource';

describe('CRM list-v2 data-source boundary', () => {
  it('uses V2 only for an enabled production API source', () => {
    assert.equal(shouldUseProductionCrmListV2(true, 'api'), true);
    assert.equal(shouldUseProductionCrmListV2(false, 'api'), false);
  });

  it('keeps demo/mock runtime on repository-backed lists even when flags are enabled', () => {
    assert.equal(shouldUseProductionCrmListV2(true, 'mock'), false);
  });
});
