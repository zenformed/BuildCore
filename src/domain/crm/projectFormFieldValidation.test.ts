import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sanitizeCityInput,
  sanitizePostalCodeInput,
  validateOptionalCity,
  validateOptionalPostalCode,
  validateProjectNotes,
} from './projectFormFieldValidation';

describe('projectFormFieldValidation', () => {
  it('sanitizes city input to letters and common punctuation', () => {
    assert.equal(sanitizeCityInput('San Antonio'), 'San Antonio');
    assert.equal(sanitizeCityInput("O'Brien"), "O'Brien");
    assert.equal(sanitizeCityInput('Austin123'), 'Austin');
  });

  it('validates optional city', () => {
    assert.equal(validateOptionalCity('').ok, true);
    assert.equal(validateOptionalCity('Dallas').ok, true);
    assert.equal(validateOptionalCity('Dallas2').ok, false);
  });

  it('sanitizes and validates zip codes', () => {
    assert.equal(sanitizePostalCodeInput('7870a1'), '78701');
    assert.deepEqual(validateOptionalPostalCode(''), { ok: true, postalCode: null });
    assert.deepEqual(validateOptionalPostalCode('78701'), { ok: true, postalCode: '78701' });
    assert.equal(validateOptionalPostalCode('7870').ok, false);
  });

  it('validates notes length', () => {
    assert.equal(validateProjectNotes('').ok, true);
    assert.equal(validateProjectNotes('a'.repeat(200)).ok, true);
    assert.equal(validateProjectNotes('a'.repeat(201)).ok, false);
  });
});
