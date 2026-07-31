import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyCustomFieldIdentityRole } from './customFieldIdentityHeuristics';

describe('classifyCustomFieldIdentityRole', () => {
  it('classifies person-like labels used in wedding / CRM imports', () => {
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'bride', label: 'Bride' }),
      'person_full_name'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'groom', label: 'Groom' }),
      'person_full_name'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'spouse', label: 'Spouse' }),
      'person_full_name'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'first_name', label: 'First Name' }),
      'person_first_name'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'last_name', label: 'Last Name' }),
      'person_last_name'
    );
  });

  it('classifies contact and address-like fields', () => {
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'mobile_phone', label: 'Mobile Phone' }),
      'phone'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'email_address', label: 'Email' }),
      'email'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'home_address', label: 'Home Address' }),
      'address'
    );
  });

  it('excludes notes / stage-like fields and defaults other text to identity_text', () => {
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'notes', label: 'Notes' }),
      'exclude'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'stage', label: 'Stage' }),
      'exclude'
    );
    assert.equal(
      classifyCustomFieldIdentityRole({ fieldKey: 'favorite_color', label: 'Favorite Color' }),
      'identity_text'
    );
  });
});
