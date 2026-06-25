import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateLeadCaptureBody, validateLeadCaptureFormFields } from '@/infrastructure/crm/server/validateLeadCaptureBody';
import { mergeLeadCaptureContactFields } from '@/infrastructure/lead/leadCaptureContactMerge';
import { pickLeadCaptureContactFromRows } from '@/infrastructure/lead/pickLeadCaptureContactFromRows';

describe('validateLeadCaptureBody', () => {
  it('accepts a valid lead capture payload', () => {
    const result = validateLeadCaptureBody({
      firstName: 'Scott',
      lastName: 'Thompson',
      email: 'Scott@Example.com',
      phone: '555-0100',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 2',
      city: 'Austin',
      state: 'tx',
      postalCode: '78701',
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.email, 'scott@example.com');
      assert.equal(result.input.state, 'TX');
    }
  });

  it('rejects missing required fields', () => {
    const result = validateLeadCaptureBody({ firstName: 'Scott' });
    assert.equal(result.ok, false);
  });

  it('returns field-level errors for an empty form', () => {
    const result = validateLeadCaptureFormFields({});
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.firstName, 'First name is required.');
      assert.equal(result.errors.email, 'Email is required.');
      assert.equal(result.errors.postalCode, 'ZIP is required.');
    }
  });
});

describe('mergeLeadCaptureContactFields', () => {
  it('fills only missing contact fields', () => {
    const merged = mergeLeadCaptureContactFields(
      {
        id: 'contact-1',
        full_name: 'Existing Name',
        email: 'existing@example.com',
        phone: '',
        client_id: null,
      },
      {
        fullName: 'New Name',
        phone: '555-0100',
        clientId: 'client-1',
      }
    );

    assert.equal(merged.full_name, 'Existing Name');
    assert.equal(merged.phone, '555-0100');
    assert.equal(merged.client_id, 'client-1');
  });
});

describe('pickLeadCaptureContactFromRows', () => {
  it('returns null when no contacts match', () => {
    assert.equal(pickLeadCaptureContactFromRows([]), null);
  });

  it('prefers the most recently updated contact when emails duplicate', () => {
    const picked = pickLeadCaptureContactFromRows([
      {
        id: 'older',
        full_name: 'Older',
        email: 'dup@example.com',
        phone: '',
        client_id: null,
        created_at: '2026-01-02T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'newer',
        full_name: 'Newer',
        email: 'dup@example.com',
        phone: '',
        client_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    assert.equal(picked?.id, 'newer');
  });

  it('breaks updated_at ties with newest created_at', () => {
    const picked = pickLeadCaptureContactFromRows([
      {
        id: 'created-first',
        full_name: 'First',
        email: 'dup@example.com',
        phone: '',
        client_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'created-second',
        full_name: 'Second',
        email: 'dup@example.com',
        phone: '',
        client_id: null,
        created_at: '2026-06-02T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    assert.equal(picked?.id, 'created-second');
  });
});
