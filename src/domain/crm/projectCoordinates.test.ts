import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isValidCrmProjectLatitude,
  isValidCrmProjectLongitude,
  validateCrmProjectCoordinates,
} from './projectCoordinates';

describe('project coordinate validation', () => {
  it('accepts boundaries and a complete coordinate pair', () => {
    assert.equal(isValidCrmProjectLatitude(-90), true);
    assert.equal(isValidCrmProjectLatitude(90), true);
    assert.equal(isValidCrmProjectLongitude(-180), true);
    assert.equal(isValidCrmProjectLongitude(180), true);
    assert.deepEqual(validateCrmProjectCoordinates(30.2672, -97.7431), {
      ok: true,
      coordinates: { latitude: 30.2672, longitude: -97.7431 },
    });
  });

  it('accepts no coordinates and rejects partial or out-of-range pairs', () => {
    assert.deepEqual(validateCrmProjectCoordinates(null, null), {
      ok: true,
      coordinates: null,
    });
    assert.deepEqual(validateCrmProjectCoordinates(null, -97.7431), {
      ok: false,
      field: 'latitude',
      message: 'Latitude is required.',
    });
    assert.equal(validateCrmProjectCoordinates(91, 0).ok, false);
    assert.equal(validateCrmProjectCoordinates(0, -181).ok, false);
  });
});
