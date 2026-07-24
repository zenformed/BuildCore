import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectParentFieldConflicts } from './spreadsheetImportGrouping';
import {
  areParentConflictsResolved,
  buildResolvedParentAttributesForGroup,
  parsePersistedConflictResolutions,
  unresolvedParentConflictFieldKeys,
} from './spreadsheetImportConflictResolution';
import type { CrmImportColumnMapping, CrmImportParsedRow } from './spreadsheetImportTypes';

const parentAddress: CrmImportColumnMapping = {
  sourceIndex: 0,
  originalHeader: 'Address',
  ownership: 'parent',
  destination: { kind: 'standard_field', entity: 'parent', key: 'address_line_1' },
};

const parentNotes: CrmImportColumnMapping = {
  sourceIndex: 1,
  originalHeader: 'Notes',
  ownership: 'parent',
  destination: { kind: 'standard_field', entity: 'parent', key: 'notes' },
};

const parentName: CrmImportColumnMapping = {
  sourceIndex: 2,
  originalHeader: 'Parent',
  ownership: 'parent',
  destination: { kind: 'standard_field', entity: 'parent', key: 'parent_name' },
};

const rows: readonly CrmImportParsedRow[] = [
  { sourceRowIndex: 1, cells: { 0: '100 Main Street', 1: 'Value A', 2: 'Alpha' } },
  { sourceRowIndex: 2, cells: { 0: '100 Main Street', 1: 'Value A', 2: 'Alpha' } },
  { sourceRowIndex: 3, cells: { 0: '100 Main Street', 1: 'Value A', 2: 'Alpha' } },
  { sourceRowIndex: 4, cells: { 0: '200 Main Street', 1: 'Value B', 2: 'Alpha' } },
];

describe('spreadsheetImportConflictResolution', () => {
  it('detects two independent parent field conflicts', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress, parentNotes, parentName],
      rows,
    });
    assert.equal(conflicts.length, 2);
    assert.ok(conflicts.some((c) => c.fieldKey === 'address_line_1'));
    assert.ok(conflicts.some((c) => c.fieldKey === 'notes'));
    assert.equal(
      conflicts.some((c) => c.fieldKey === 'parent_name'),
      false
    );
  });

  it('does not treat whitespace/case-only differences as conflicts', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress],
      rows: [
        { sourceRowIndex: 1, cells: { 0: '100 Main Street' } },
        { sourceRowIndex: 2, cells: { 0: '  100   MAIN street ' } },
      ],
    });
    assert.equal(conflicts.length, 0);
  });

  it('blocks only unresolved conflict fields for a group', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress, parentNotes],
      rows,
    });
    const partial = {
      address_line_1: { kind: 'choose_existing' as const, value: '100 Main Street' },
    };
    assert.deepEqual(unresolvedParentConflictFieldKeys(conflicts, partial), ['notes']);
    assert.equal(areParentConflictsResolved(conflicts, partial), false);
  });

  it('accepts choosing an existing conflicting value', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress, parentNotes],
      rows,
    });
    const resolutions = {
      address_line_1: { kind: 'choose_existing' as const, value: '100 Main Street' },
      notes: { kind: 'choose_existing' as const, value: 'Value A' },
    };
    const built = buildResolvedParentAttributesForGroup({
      displayParentName: 'Alpha',
      mappings: [parentAddress, parentNotes, parentName],
      rows,
      conflicts,
      conflictResolutions: resolutions,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.attributes.addressLine1, '100 Main Street');
    assert.equal(built.attributes.notes, 'Value A');
    assert.equal(built.attributes.name, 'Alpha');
  });

  it('accepts entering a replacement value', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress],
      rows,
    });
    const built = buildResolvedParentAttributesForGroup({
      displayParentName: 'Alpha',
      mappings: [parentAddress, parentName],
      rows,
      conflicts,
      conflictResolutions: {
        address_line_1: { kind: 'replacement', value: '300 Oak Ave' },
      },
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.attributes.addressLine1, '300 Oak Ave');
  });

  it('uses saved conflict resolutions for parent creation attributes', () => {
    const conflicts = detectParentFieldConflicts({
      mappings: [parentAddress, parentNotes],
      rows,
    });
    const persisted = parsePersistedConflictResolutions({
      conflicts,
      resolutions: {
        address_line_1: { kind: 'choose_existing', value: '200 Main Street' },
        notes: { kind: 'replacement', value: 'Final notes' },
      },
    });
    const built = buildResolvedParentAttributesForGroup({
      displayParentName: 'Alpha',
      mappings: [parentAddress, parentNotes, parentName],
      rows,
      conflicts,
      conflictResolutions: persisted,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.attributes.addressLine1, '200 Main Street');
    assert.equal(built.attributes.notes, 'Final notes');
  });

  it('survives job reload by parsing conflict_state resolutions', () => {
    const parsed = parsePersistedConflictResolutions({
      conflicts: [{ fieldKey: 'notes', values: [] }],
      resolutions: {
        notes: { kind: 'replacement', value: 'Reloaded' },
      },
    });
    assert.deepEqual(parsed.notes, { kind: 'replacement', value: 'Reloaded' });
  });

  it('keeps an unrelated second group importable when only one group has unresolved conflicts', () => {
    const groupAConflicts = detectParentFieldConflicts({
      mappings: [parentAddress],
      rows,
    });
    const groupBConflicts = detectParentFieldConflicts({
      mappings: [parentAddress],
      rows: [
        { sourceRowIndex: 10, cells: { 0: '1 Same St' } },
        { sourceRowIndex: 11, cells: { 0: '1 Same St' } },
      ],
    });
    assert.equal(areParentConflictsResolved(groupAConflicts, {}), false);
    assert.equal(areParentConflictsResolved(groupBConflicts, {}), true);
    const groupB = buildResolvedParentAttributesForGroup({
      displayParentName: 'Beta',
      mappings: [parentAddress, parentName],
      rows: [
        { sourceRowIndex: 10, cells: { 0: '1 Same St', 2: 'Beta' } },
        { sourceRowIndex: 11, cells: { 0: '1 Same St', 2: 'Beta' } },
      ],
      conflicts: groupBConflicts,
      conflictResolutions: {},
    });
    assert.equal(groupB.ok, true);
  });

  it('attach_existing clears conflict resolutions as irrelevant (empty map)', () => {
    // Documented product rule: attach must not overwrite parent; UI clears resolutions.
    const cleared = parsePersistedConflictResolutions({
      conflicts: [{ fieldKey: 'notes', values: [] }],
      resolutions: {},
    });
    assert.deepEqual(cleared, {});
  });
});
