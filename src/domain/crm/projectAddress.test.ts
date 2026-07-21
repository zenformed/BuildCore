import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emptyCrmProjectAddress,
  formatCrmProjectCoordinateLine,
  formatCrmProjectLocationLine,
} from './projectAddress';

describe('project location formatting', () => {
  it('prefers a street address when one is available', () => {
    const address = {
      ...emptyCrmProjectAddress(),
      addressLine1: '123 Main St',
      city: 'Austin',
      state: 'TX',
    };

    assert.equal(
      formatCrmProjectLocationLine(address, 30.2672, -97.7431),
      '123 Main St, Austin, TX'
    );
  });

  it('falls back to a valid latitude and longitude pair', () => {
    assert.equal(
      formatCrmProjectLocationLine(emptyCrmProjectAddress(), 30.2672, -97.7431),
      '30.2672, -97.7431'
    );
    assert.equal(formatCrmProjectCoordinateLine(30.123456789, -97.123456789), '30.123457, -97.123457');
  });

  it('does not display partial or invalid coordinates', () => {
    const address = emptyCrmProjectAddress();
    assert.equal(formatCrmProjectLocationLine(address, 30.2672, null), null);
    assert.equal(formatCrmProjectLocationLine(address, 91, -97.7431), null);
  });
});
