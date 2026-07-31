import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultCreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  buildCreateFormDuplicateProbe,
  createFormHasEnoughIdentityForDuplicateCheck,
} from './createFormDuplicateProbe';

describe('createFormDuplicateProbe', () => {
  it('requires meaningful identity before checking', () => {
    const empty = defaultCreateCrmProjectFormState();
    assert.equal(createFormHasEnoughIdentityForDuplicateCheck(empty, {}), false);

    assert.equal(
      createFormHasEnoughIdentityForDuplicateCheck(
        { ...empty, emails: ['brenda@example.com'] },
        {}
      ),
      true
    );
    assert.equal(
      createFormHasEnoughIdentityForDuplicateCheck(
        { ...empty, contactName: 'Brenda Smith' },
        {}
      ),
      true
    );
    assert.equal(
      createFormHasEnoughIdentityForDuplicateCheck({ ...empty, contactName: 'Brenda' }, {}),
      false
    );
  });

  it('builds probe fields from the create form', () => {
    const form = {
      ...defaultCreateCrmProjectFormState(),
      name: 'Lead A',
      contactName: 'Brenda Smith',
      emails: ['a@b.com', ''],
      phones: ['(615) 555-1111'],
      addressLine1: '100 Main',
      city: 'Nashville',
      state: 'TN',
      postalCode: '37201',
    };
    const probe = buildCreateFormDuplicateProbe({
      form,
      recordType: 'subproject',
      customFieldDraft: { bride: 'Brenda Smith' },
      customFieldDefinitions: [
        {
          id: 'def-1',
          fieldKey: 'bride',
          label: 'Bride',
          fieldType: 'text',
          scope: 'subproject',
          displayOrder: 0,
          isArchived: false,
          source: 'user',
        },
      ],
      excludeRecordId: 'rec-1',
    });

    assert.equal(probe.recordType, 'subproject');
    assert.equal(probe.projectName, 'Lead A');
    assert.deepEqual(probe.emails, ['a@b.com']);
    assert.equal(probe.excludeRecordId, 'rec-1');
    assert.equal(probe.customFields?.[0]?.fieldKey, 'bride');
  });
});
