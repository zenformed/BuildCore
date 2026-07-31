import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMultiMergeField,
  buildScalarMergeField,
  defaultMergeFieldsForUpdateExisting,
  mergeFieldSelectionEnabled,
  resolveSurvivingMultiValues,
  resolveSurvivingScalar,
  selectSingleMergeSide,
  toggleMultiMergeSide,
  type MergeFieldState,
} from './mergeFieldSelection';

describe('mergeFieldSelection', () => {
  it('builds identical scalar when values match (case-insensitive)', () => {
    const field = buildScalarMergeField({
      fieldKey: 'email',
      label: 'Email',
      incomingValue: 'John@Email.com',
      existingValue: 'john@email.com',
    });
    assert.equal(field?.kind, 'identical');
    if (field?.kind === 'identical') {
      assert.equal(field.value, 'john@email.com');
    }
  });

  it('defaults single conflicts to existing side', () => {
    const field = buildScalarMergeField({
      fieldKey: 'city',
      label: 'City',
      incomingValue: 'Seattle',
      existingValue: 'Tacoma',
    });
    assert.equal(field?.kind, 'conflict');
    if (field?.kind === 'conflict' && field.cardinality === 'single') {
      assert.equal(field.selected, 'existing');
      assert.equal(resolveSurvivingScalar(field), 'Tacoma');
      const switched = selectSingleMergeSide(field, 'incoming');
      assert.equal(switched.selected, 'incoming');
      assert.equal(resolveSurvivingScalar(switched), 'Seattle');
    }
  });

  it('allows keeping both sides on multi conflicts', () => {
    const field = buildMultiMergeField({
      fieldKey: 'emails',
      label: 'Emails',
      incomingValues: ['a@x.com', 'b@x.com'],
      existingValues: ['c@x.com'],
    });
    assert.equal(field?.kind, 'conflict');
    if (field?.kind === 'conflict' && field.cardinality === 'multi') {
      assert.equal(field.keepIncoming, false);
      assert.equal(field.keepExisting, true);
      assert.deepEqual(resolveSurvivingMultiValues(field), ['c@x.com']);

      const both = toggleMultiMergeSide(field, 'incoming');
      assert.equal(both.keepIncoming, true);
      assert.equal(both.keepExisting, true);
      assert.deepEqual(resolveSurvivingMultiValues(both), ['c@x.com', 'a@x.com', 'b@x.com']);
    }
  });

  it('refuses to clear the last multi side', () => {
    const field = buildMultiMergeField({
      fieldKey: 'phones',
      label: 'Phones',
      incomingValues: ['111'],
      existingValues: ['222'],
    });
    assert.ok(field && field.kind === 'conflict' && field.cardinality === 'multi');
    if (field.kind === 'conflict' && field.cardinality === 'multi') {
      // default: existing only — toggling existing off should no-op
      const blocked = toggleMultiMergeSide(field, 'existing');
      assert.equal(blocked.keepExisting, true);
      assert.equal(blocked.keepIncoming, false);
    }
  });

  it('resets conflicts to existing when applying Update Existing defaults', () => {
    const fields: MergeFieldState[] = [
      {
        kind: 'conflict',
        cardinality: 'single',
        fieldKey: 'name',
        label: 'Name',
        incomingValue: 'A',
        existingValue: 'B',
        selected: 'incoming',
      },
      {
        kind: 'conflict',
        cardinality: 'multi',
        fieldKey: 'tags',
        label: 'Tags',
        incomingValues: ['x'],
        existingValues: ['y'],
        keepIncoming: true,
        keepExisting: false,
      },
      {
        kind: 'identical',
        fieldKey: 'state',
        label: 'State',
        value: 'WA',
      },
    ];
    const next = defaultMergeFieldsForUpdateExisting(fields);
    const name = next[0]!;
    const tags = next[1]!;
    assert.ok(name.kind === 'conflict' && name.cardinality === 'single');
    assert.equal(name.selected, 'existing');
    assert.ok(tags.kind === 'conflict' && tags.cardinality === 'multi');
    assert.equal(tags.keepIncoming, false);
    assert.equal(tags.keepExisting, true);
    assert.equal(next[2]?.kind, 'identical');
  });

  it('enables field selection only for update_existing', () => {
    assert.equal(mergeFieldSelectionEnabled('update_existing'), true);
    assert.equal(mergeFieldSelectionEnabled('import_new'), false);
    assert.equal(mergeFieldSelectionEnabled('skip'), false);
    assert.equal(mergeFieldSelectionEnabled(null), false);
  });
});
