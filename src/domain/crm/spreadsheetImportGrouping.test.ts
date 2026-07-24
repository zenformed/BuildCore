import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildImportParentGroups,
  detectParentFieldConflicts,
  normalizeImportText,
} from './spreadsheetImportGrouping';
import type { CrmImportColumnMapping, CrmImportParsedRow } from './spreadsheetImportTypes';

describe('spreadsheetImportGrouping', () => {
  it('normalizes import text with trim, collapse, and casefold', () => {
    assert.equal(normalizeImportText('  Acme   Corp  '), 'acme corp');
  });

  it('builds a single fixed group for into_existing_parent mode', () => {
    const rows: CrmImportParsedRow[] = [
      { sourceRowIndex: 1, cells: { 0: 'Unit A' } },
      { sourceRowIndex: 2, cells: { 0: 'Unit B' } },
    ];
    const mappings: CrmImportColumnMapping[] = [
      {
        sourceIndex: 0,
        originalHeader: 'Subproject',
        ownership: 'subproject',
        destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
      },
    ];

    const groups = buildImportParentGroups({
      mode: 'into_existing_parent',
      fixedParentProjectId: 'parent-1',
      fixedParentDisplayName: 'Parent Co',
      mappings,
      rows,
    });

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.kind, 'fixed');
    assert.equal(groups[0]?.displayParentName, 'Parent Co');
    assert.deepEqual(groups[0]?.sourceRowIndexes, [1, 2]);
  });

  it('groups master_hierarchy rows by identifier before name', () => {
    const rows: CrmImportParsedRow[] = [
      { sourceRowIndex: 1, cells: { 0: 'JOB-1', 1: 'Alpha', 2: 'Unit 1' } },
      { sourceRowIndex: 2, cells: { 0: 'JOB-1', 1: 'Alpha', 2: 'Unit 2' } },
      { sourceRowIndex: 3, cells: { 0: '', 1: 'Beta', 2: 'Unit 3' } },
    ];
    const mappings: CrmImportColumnMapping[] = [
      {
        sourceIndex: 0,
        originalHeader: 'Job #',
        ownership: 'parent',
        destination: { kind: 'standard_field', entity: 'parent', key: 'parent_identifier' },
      },
      {
        sourceIndex: 1,
        originalHeader: 'Parent',
        ownership: 'parent',
        destination: { kind: 'standard_field', entity: 'parent', key: 'parent_name' },
      },
      {
        sourceIndex: 2,
        originalHeader: 'Unit',
        ownership: 'subproject',
        destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
      },
    ];

    const groups = buildImportParentGroups({
      mode: 'master_hierarchy',
      mappings,
      rows,
    });

    assert.equal(groups.length, 2);
    assert.equal(groups.find((group) => group.kind === 'id')?.sourceRowIndexes.length, 2);
    assert.equal(groups.find((group) => group.kind === 'name')?.displayParentName, 'Beta');
  });

  it('detects parent field conflicts within a group', () => {
    const rows: CrmImportParsedRow[] = [
      { sourceRowIndex: 1, cells: { 0: 'Austin' } },
      { sourceRowIndex: 2, cells: { 0: 'Dallas' } },
    ];
    const mappings: CrmImportColumnMapping[] = [
      {
        sourceIndex: 0,
        originalHeader: 'City',
        ownership: 'parent',
        destination: { kind: 'standard_field', entity: 'parent', key: 'city' },
      },
    ];

    const conflicts = detectParentFieldConflicts({ mappings, rows });
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]?.fieldKey, 'city');
    assert.equal(conflicts[0]?.values.length, 2);
  });
});
