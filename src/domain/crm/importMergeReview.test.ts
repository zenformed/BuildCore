import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildContactCollectionField,
  buildIdenticalOrScalarField,
  buildImportMergeSummaryBullets,
  buildNotesMergeField,
  countImportMergeGroupDecisionsRemaining,
  createDefaultMergeGroupDecision,
  resolveContactCollectionResult,
  resolveNotesResult,
  resolveScalarResult,
  setContactCollectionPrimary,
  toggleContactCollectionOption,
} from '@/domain/crm/importMergeReview';

describe('importMergeReview', () => {
  it('builds contact collections with include/exclude and primary', () => {
    const field = buildContactCollectionField({
      fieldKey: 'phone',
      label: 'Phone',
      existingValues: ['(615) 555-1111', '(615) 555-2222'],
      importedValues: ['(615) 555-3333', '(615) 555-1111'],
    });
    assert.equal(field?.kind, 'contact_collection');
    if (field?.kind !== 'contact_collection') return;

    assert.equal(field.options.length, 3);
    assert.equal(field.options.filter((option) => option.selected).length, 3);
    assert.equal(field.primaryValue, '(615) 555-1111');

    const toggled = toggleContactCollectionOption(field, field.options[2]!.normalizedKey);
    assert.equal(toggled.options.filter((option) => option.selected).length, 2);

    const withPrimary = setContactCollectionPrimary(
      toggled,
      toggled.options.find((option) => option.selected)!.value
    );
    const result = resolveContactCollectionResult(withPrimary);
    assert.equal(result[0]?.isPrimary, true);

    const secondSelected = toggled.options.filter((option) => option.selected)[1]!;
    const reassigned = setContactCollectionPrimary(toggled, secondSelected.value);
    const stable = resolveContactCollectionResult(reassigned);
    assert.deepEqual(
      stable.map((entry) => entry.value),
      toggled.options.filter((option) => option.selected).map((option) => option.value)
    );
    assert.equal(stable[0]?.isPrimary, false);
    assert.equal(stable[1]?.isPrimary, true);
  });

  it('requires a decision when more than 4 contact values would be selected', () => {
    const field = buildContactCollectionField({
      fieldKey: 'email',
      label: 'Email',
      existingValues: ['a@x.com', 'b@x.com', 'c@x.com'],
      importedValues: ['d@x.com', 'e@x.com'],
    });
    assert.equal(field?.kind, 'contact_collection');
    if (field?.kind !== 'contact_collection') return;
    assert.equal(field.options.length, 5);
    assert.equal(field.options.filter((option) => option.selected).length, 4);
    assert.equal(field.requiresDecision, false);
  });

  it('builds identical and scalar fields', () => {
    const identical = buildIdenticalOrScalarField({
      fieldKey: 'contact',
      label: 'Contact',
      existingValue: 'Brenda',
      importedValue: 'brenda',
    });
    assert.equal(identical?.kind, 'identical');

    const conflict = buildIdenticalOrScalarField({
      fieldKey: 'address',
      label: 'Address',
      existingValue: 'Cherry',
      importedValue: 'Oak',
      defaultAction: 'keep_existing',
    });
    assert.equal(conflict?.kind, 'scalar');
    if (conflict?.kind === 'scalar') {
      assert.equal(resolveScalarResult(conflict), 'Cherry');
    }
  });

  it('appends notes with a separator in the live result', () => {
    const field = buildNotesMergeField({
      label: 'Notes',
      existingValue: 'Existing note',
      importedValue: 'Imported note',
    });
    assert.equal(field?.kind, 'notes');
    if (field?.kind === 'notes') {
      assert.equal(resolveNotesResult(field), 'Existing note\n---\nImported note');
    }
  });

  it('counts remaining decisions for replace confirmation', () => {
    const decision = createDefaultMergeGroupDecision({
      incomingId: 'row:1',
      matchedRecordId: 'e1',
      fields: [],
    });
    assert.equal(countImportMergeGroupDecisionsRemaining(decision), 0);
    assert.equal(
      countImportMergeGroupDecisionsRemaining({
        ...decision,
        recordAction: 'replace_existing',
        replaceConfirmed: false,
      }),
      1
    );
    assert.equal(
      countImportMergeGroupDecisionsRemaining({
        ...decision,
        recordAction: 'keep_both',
      }),
      0
    );
  });

  it('builds live summary bullets for merge into existing', () => {
    const phones = buildContactCollectionField({
      fieldKey: 'phone',
      label: 'Phone',
      existingValues: ['111'],
      importedValues: ['222'],
    });
    assert.ok(phones && phones.kind === 'contact_collection');
    const decision = createDefaultMergeGroupDecision({
      incomingId: 'row:1',
      matchedRecordId: 'e1',
      fields: [phones],
    });
    const bullets = buildImportMergeSummaryBullets({
      decision,
      copy: {
        existingRemains: 'Existing remains',
        importedRemoved: 'Imported removed',
        keepBoth: 'Keep both',
        replaceExisting: 'Replace',
        addressReplaced: 'Address replaced',
        addressKept: 'Address kept',
        stageKept: 'Stage kept',
        stageUpdated: (stage) => `Stage ${stage}`,
        phonesRetained: (count) => `${count} phones`,
        emailsRetained: (count) => `${count} emails`,
        primaryPhone: (value) => `Primary ${value}`,
        primaryEmail: (value) => `Primary ${value}`,
        notesAppended: 'Notes appended',
        notesReplaced: 'Notes replaced',
        notesKept: 'Notes kept',
        photosCombined: (_e, _i, total) => `${total} photos`,
        documentsCombined: (_e, _i, total) => `${total} docs`,
        contactKept: 'Contact kept',
        contactReplaced: (value) => `Contact ${value}`,
        nameKept: 'Name kept',
        nameReplaced: (value) => `Name ${value}`,
        customUpdated: (count) => `${count} custom`,
      },
    });
    assert.equal(bullets[0]?.text, 'Existing remains');
    assert.ok(bullets.some((b) => b.text === '2 phones'));
  });
});
