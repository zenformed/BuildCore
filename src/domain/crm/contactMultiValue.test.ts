import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmContactDbWritePayload,
  normalizeContactEmails,
  normalizeContactPhones,
  resolveContactEmailsFromDb,
  resolveContactPhonesFromDb,
  validateContactEmailValues,
  validateContactPhoneValues,
} from './contactMultiValue';

describe('contactMultiValue', () => {
  it('normalizes emails by trimming, deduping, and capping at 4', () => {
    assert.deepEqual(
      normalizeContactEmails([' a@x.com ', 'b@x.com', 'a@x.com', '', 'c@x.com', 'd@x.com', 'e@x.com']),
      ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']
    );
  });

  it('migrates legacy single email/phone columns', () => {
    assert.deepEqual(resolveContactEmailsFromDb([], 'legacy@example.com'), ['legacy@example.com']);
    assert.deepEqual(resolveContactPhonesFromDb(null, '555-0100'), ['555-0100']);
    assert.deepEqual(resolveContactEmailsFromDb(['one@x.com', 'two@x.com'], 'legacy@example.com'), [
      'one@x.com',
      'two@x.com',
    ]);
  });

  it('validates email format and max count', () => {
    assert.equal(validateContactEmailValues(['bad']).ok, false);
    assert.equal(validateContactEmailValues(['ok@example.com', '']).ok, true);
    assert.equal(
      validateContactEmailValues(['1@x.com', '2@x.com', '3@x.com', '4@x.com', '5@x.com']).ok,
      false
    );
  });

  it('validates phone max count and length', () => {
    assert.equal(validateContactPhoneValues(['555']).ok, true);
    assert.equal(validateContactPhoneValues(['x'.repeat(41)]).ok, false);
  });

  it('writes primary columns from first array values', () => {
    assert.deepEqual(
      buildCrmContactDbWritePayload(['a@x.com', 'b@x.com'], ['1112223333', '4445556666']),
      {
        contact_emails: ['a@x.com', 'b@x.com'],
        contact_phones: ['(111) 222-3333', '(444) 555-6666'],
        email: 'a@x.com',
        phone: '(111) 222-3333',
      }
    );
    assert.deepEqual(buildCrmContactDbWritePayload([], []), {
      contact_emails: [],
      contact_phones: [],
      email: null,
      phone: null,
    });
  });
});
