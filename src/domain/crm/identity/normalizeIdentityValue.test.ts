import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeIdentityAddress,
  normalizeIdentityEmail,
  normalizeIdentityName,
  normalizeIdentityPhone,
  normalizeIdentityTextValue,
  normalizeIdentityValue,
} from './normalizeIdentityValue';

describe('normalizeIdentityValue', () => {
  it('normalizes emails by trim + lowercase', () => {
    assert.equal(normalizeIdentityEmail('  Brenda@Example.COM '), 'brenda@example.com');
    assert.equal(normalizeIdentityEmail('not-an-email'), null);
    assert.equal(normalizeIdentityValue('email', 'A@B.co'), 'a@b.co');
  });

  it('normalizes phones to digits and rejects incomplete numbers', () => {
    assert.equal(normalizeIdentityPhone('(615) 555-1111'), '6155551111');
    assert.equal(normalizeIdentityPhone('1-615-555-1111'), '6155551111');
    assert.equal(normalizeIdentityPhone('615-555'), null);
    assert.equal(normalizeIdentityPhone('ext. 42'), null);
  });

  it('normalizes names: lowercase, collapse space, strip punctuation', () => {
    assert.equal(normalizeIdentityName('  Brenda,  Smith. '), 'brenda smith');
    assert.equal(normalizeIdentityName('Mark Smith'), 'mark smith');
  });

  it('excludes weak single-token given names but keeps multi-token and uncommon singles', () => {
    assert.equal(normalizeIdentityName('Brenda'), null);
    assert.equal(normalizeIdentityName('Brenda Smith'), 'brenda smith');
    assert.equal(normalizeIdentityName('Zenformed'), 'zenformed');
    assert.equal(normalizeIdentityName('Brenda', { allowWeakSingleToken: true }), 'brenda');
  });

  it('normalizes addresses from structured parts', () => {
    assert.equal(
      normalizeIdentityAddress({
        addressLine1: '100 Main St.',
        addressLine2: null,
        city: 'Nashville',
        state: 'TN',
        postalCode: '37201-1234',
      }),
      '100 main st nashville tn 37201'
    );
    assert.equal(
      normalizeIdentityAddress({
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        postalCode: null,
      }),
      null
    );
  });

  it('rejects stop words and overlong identity_text', () => {
    assert.equal(normalizeIdentityTextValue('Yes'), null);
    assert.equal(normalizeIdentityTextValue('Residential'), null);
    assert.equal(normalizeIdentityTextValue('a'.repeat(81)), null);
    assert.equal(normalizeIdentityTextValue('Plot 42'), 'plot 42');
  });
});
