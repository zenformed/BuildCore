import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyManualStreetAddressEdit,
  applyVerifiedGoogleAddress,
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  validateCrmProjectCoordinateFormFields,
} from './createCrmProjectFormModel';

function validBaseForm() {
  return {
    ...defaultCreateCrmProjectFormState(),
    name: 'Test Project',
    contactName: 'Test Contact',
  };
}

describe('project address entry form', () => {
  it('keeps coordinates null for a street-only project', () => {
    const result = validateCreateCrmProjectForm({
      ...validBaseForm(),
      addressLine1: '100 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.latitude, null);
      assert.equal(result.input.longitude, null);
      assert.equal(result.input.addressLine1, '100 Main St');
    }
  });

  it('parses and preserves manual coordinates independently of street fields', () => {
    const result = validateCreateCrmProjectForm({
      ...validBaseForm(),
      addressEntryMode: 'coordinates',
      latitude: '30.2672',
      longitude: '-97.7431',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.latitude, 30.2672);
      assert.equal(result.input.longitude, -97.7431);
      assert.equal(result.input.addressLine1, null);
    }
  });

  it('returns inline errors for both missing coordinate fields', () => {
    assert.deepEqual(
      validateCrmProjectCoordinateFormFields({
        addressEntryMode: 'coordinates',
        latitude: '',
        longitude: '',
      }),
      {
        latitude: 'Latitude is required.',
        longitude: 'Longitude is required.',
      }
    );
  });

  it('rejects out-of-range manual coordinates', () => {
    const result = validateCreateCrmProjectForm({
      ...validBaseForm(),
      addressEntryMode: 'coordinates',
      latitude: '90.1',
      longitude: '-180.1',
    });
    assert.deepEqual(result, {
      ok: false,
      message: 'Latitude must be between -90 and 90.',
    });
  });

  it('clears existing coordinates when a street address is manually changed', () => {
    const form = {
      ...validBaseForm(),
      addressLine1: '100 Main St',
      latitude: '30.2672',
      longitude: '-97.7431',
    };
    assert.deepEqual(applyManualStreetAddressEdit(form, 'addressLine1', '101 Main St'), {
      ...form,
      addressLine1: '101 Main St',
      latitude: '',
      longitude: '',
    });
  });

  it('atomically applies a verified Google address and coordinates', () => {
    const form = {
      ...validBaseForm(),
      addressLine2: 'Suite 200',
    };
    assert.deepEqual(
      applyVerifiedGoogleAddress(form, {
        addressLine1: '1600 Amphitheatre Parkway',
        city: 'Mountain View',
        state: 'CA',
        postalCode: '94043',
        latitude: 37.422,
        longitude: -122.084,
      }),
      {
        ...form,
        addressEntryMode: 'street',
        addressLine1: '1600 Amphitheatre Parkway',
        city: 'Mountain View',
        state: 'CA',
        postalCode: '94043',
        latitude: '37.422',
        longitude: '-122.084',
      }
    );
  });
});
