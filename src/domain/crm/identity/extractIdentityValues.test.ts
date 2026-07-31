import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractIdentityValues, collapseIdentityValueDrafts } from './extractIdentityValues';
import type { CrmIdentityRecordSnapshot, CrmIdentityValueDraft } from './identityTypes';

function baseSnapshot(
  overrides: Partial<CrmIdentityRecordSnapshot> = {}
): CrmIdentityRecordSnapshot {
  return {
    organizationId: 'org-1',
    recordId: 'rec-1',
    recordType: 'subproject',
    projectName: null,
    contactName: null,
    emails: [],
    phones: [],
    address: {
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
    },
    customFields: [],
    ...overrides,
  };
}

function byType(
  drafts: readonly CrmIdentityValueDraft[],
  valueType: CrmIdentityValueDraft['valueType']
): readonly string[] {
  return drafts.filter((d) => d.valueType === valueType).map((d) => d.normalizedValue);
}

describe('extractIdentityValues', () => {
  it('indexes standard contact email/phone/name and project address', () => {
    const drafts = extractIdentityValues(
      baseSnapshot({
        projectName: 'Brenda Smith',
        contactName: 'Brenda Smith',
        emails: ['Brenda@Example.com', 'brenda@example.com'],
        phones: ['(615) 555-1111', '615-555-1111'],
        address: {
          addressLine1: '100 Main St',
          addressLine2: null,
          city: 'Nashville',
          state: 'TN',
          postalCode: '37201',
        },
      })
    );

    assert.deepEqual(byType(drafts, 'email'), ['brenda@example.com']);
    assert.deepEqual(byType(drafts, 'phone'), ['6155551111']);
    assert.ok(byType(drafts, 'name').includes('brenda smith'));
    assert.equal(byType(drafts, 'address').length, 1);
    assert.match(byType(drafts, 'address')[0]!, /100 main st/);
  });

  it('matches Bride custom field to First Name + Last Name combination', () => {
    const recordA = extractIdentityValues(
      baseSnapshot({
        recordId: 'a',
        customFields: [
          {
            definitionId: 'd1',
            valueId: 'v1',
            fieldKey: 'bride',
            label: 'Bride',
            valueText: 'Brenda Smith',
          },
          {
            definitionId: 'd2',
            valueId: 'v2',
            fieldKey: 'groom',
            label: 'Groom',
            valueText: 'Mark Smith',
          },
          {
            definitionId: 'd3',
            valueId: 'v3',
            fieldKey: 'phone_number',
            label: 'Phone Number',
            valueText: '615-555-1111',
          },
        ],
      })
    );

    const recordB = extractIdentityValues(
      baseSnapshot({
        recordId: 'b',
        customFields: [
          {
            definitionId: 'd4',
            valueId: 'v4',
            fieldKey: 'first_name',
            label: 'First Name',
            valueText: 'Brenda',
          },
          {
            definitionId: 'd5',
            valueId: 'v5',
            fieldKey: 'last_name',
            label: 'Last Name',
            valueText: 'Smith',
          },
          {
            definitionId: 'd6',
            valueId: 'v6',
            fieldKey: 'spouse',
            label: 'Spouse',
            valueText: 'Mark Smith',
          },
          {
            definitionId: 'd7',
            valueId: 'v7',
            fieldKey: 'mobile_phone',
            label: 'Mobile Phone',
            valueText: '(615) 555-1111',
          },
        ],
      })
    );

    assert.ok(byType(recordA, 'name').includes('brenda smith'));
    assert.ok(byType(recordA, 'name').includes('mark smith'));
    assert.deepEqual(byType(recordA, 'phone'), ['6155551111']);

    assert.ok(byType(recordB, 'name').includes('brenda smith'));
    assert.ok(byType(recordB, 'name').includes('mark smith'));
    assert.deepEqual(byType(recordB, 'phone'), ['6155551111']);

    // Lone first/last tokens must not be indexed as strong standalone names.
    assert.ok(!byType(recordB, 'name').includes('brenda'));
    assert.ok(!byType(recordB, 'name').includes('smith'));
  });

  it('combines prepared nameParts first + last', () => {
    const drafts = extractIdentityValues(
      baseSnapshot({
        nameParts: { firstName: 'Brenda', lastName: 'Smith' },
      })
    );
    assert.deepEqual(byType(drafts, 'name'), ['brenda smith']);
    const source = drafts.find((d) => d.valueType === 'name');
    assert.equal(source?.sourceKind, 'name_parts');
  });

  it('excludes notes-like custom fields and stop-word identity_text', () => {
    const drafts = extractIdentityValues(
      baseSnapshot({
        customFields: [
          {
            definitionId: 'd1',
            valueId: 'v1',
            fieldKey: 'notes',
            label: 'Notes',
            valueText: 'Long freeform story about the client',
          },
          {
            definitionId: 'd2',
            valueId: 'v2',
            fieldKey: 'property_type',
            label: 'Property Type',
            valueText: 'Residential',
          },
          {
            definitionId: 'd3',
            valueId: 'v3',
            fieldKey: 'plot_code',
            label: 'Plot Code',
            valueText: 'Plot 42',
          },
        ],
      })
    );

    assert.deepEqual(byType(drafts, 'identity_text'), ['plot 42']);
    assert.equal(drafts.length, 1);
  });

  it('collapses duplicate sources to the highest-priority canonical source', () => {
    const drafts = collapseIdentityValueDrafts([
      {
        valueType: 'email',
        normalizedValue: 'a@b.com',
        sourceKind: 'custom_field',
        sourceFieldKey: 'email',
        sourceFieldLabel: 'Email',
        sourceValueId: 'v1',
        sourcePriority: 80,
      },
      {
        valueType: 'email',
        normalizedValue: 'a@b.com',
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
        sourceValueId: null,
        sourcePriority: 100,
      },
    ]);
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0]?.sourceKind, 'contact_email');
  });
});
