import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractUsPhoneDigits,
  formatUsPhoneDisplay,
  formatUsPhoneInput,
} from './phoneFormat';

describe('phoneFormat', () => {
  it('formats progressively as digits are entered', () => {
    assert.equal(formatUsPhoneInput('9'), '(9');
    assert.equal(formatUsPhoneInput('918'), '(918');
    assert.equal(formatUsPhoneInput('9186'), '(918) 6');
    assert.equal(formatUsPhoneInput('918671'), '(918) 671');
    assert.equal(formatUsPhoneInput('9186713407'), '(918) 671-3407');
  });

  it('reformats pasted raw digits and existing formatted values', () => {
    assert.equal(formatUsPhoneInput('9186713407'), '(918) 671-3407');
    assert.equal(formatUsPhoneInput('(918) 671-3407'), '(918) 671-3407');
    assert.equal(formatUsPhoneInput('1-918-671-3407'), '(918) 671-3407');
  });

  it('extracts up to 10 US digits', () => {
    assert.equal(extractUsPhoneDigits('(918) 671-3407'), '9186713407');
    assert.equal(extractUsPhoneDigits('19186713407'), '9186713407');
  });

  it('formats complete numbers for display', () => {
    assert.equal(formatUsPhoneDisplay('9185438129'), '(918) 543-8129');
    assert.equal(formatUsPhoneDisplay('(713) 555-0198'), '(713) 555-0198');
    assert.equal(formatUsPhoneDisplay('ext. 42'), 'ext. 42');
  });
});
