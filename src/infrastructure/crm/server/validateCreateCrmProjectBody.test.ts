import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateCreateCrmProjectBody } from './validateCreateCrmProjectBody';

const baseBody = {
  name: 'Coordinate Project',
  contactName: 'Test Contact',
  emails: [],
  phones: [],
  priority: 'normal',
  industry: 'hvac',
  customIndustry: null,
  currentStageSlug: 'lead',
  notes: null,
  dealValueCents: 0,
  balanceRemainingCents: 0,
  assignedMemberId: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
};

const options = { allowedStageSlugs: new Set(['lead']) };

describe('validateCreateCrmProjectBody coordinates', () => {
  it('accepts null coordinates', () => {
    const result = validateCreateCrmProjectBody(
      { ...baseBody, latitude: null, longitude: null },
      options
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.latitude, null);
      assert.equal(result.input.longitude, null);
    }
  });

  it('accepts a valid pair and rejects incomplete pairs', () => {
    const valid = validateCreateCrmProjectBody(
      { ...baseBody, latitude: 29.7604, longitude: -95.3698 },
      options
    );
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.input.latitude, 29.7604);
      assert.equal(valid.input.longitude, -95.3698);
    }

    const incomplete = validateCreateCrmProjectBody(
      { ...baseBody, latitude: 29.7604, longitude: null },
      options
    );
    assert.deepEqual(incomplete, {
      ok: false,
      message: 'Longitude is required.',
    });
  });
});
