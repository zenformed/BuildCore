import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isMultiProjectOrganizationSelectable } from '@/presentation/features/crmImport/interview/multiProjectOrganizationPresentation';

describe('multiProjectOrganization UI gates', () => {
  it('allows any selected organization option to continue', () => {
    assert.equal(isMultiProjectOrganizationSelectable(null), false);
    assert.equal(isMultiProjectOrganizationSelectable('repeating_column'), true);
    assert.equal(isMultiProjectOrganizationSelectable('header_rows'), true);
    assert.equal(isMultiProjectOrganizationSelectable('worksheet_per_project'), true);
    assert.equal(isMultiProjectOrganizationSelectable('unsure'), true);
  });
});
