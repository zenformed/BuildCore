import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildHeaderRowProjectGroups,
  deriveProjectNameFromHeaderRow,
  listUnassignedRowsBeforeFirstProjectHeader,
  projectHeaderGroupId,
  scoreProjectHeaderCandidate,
  suggestProjectHeaderRowIndexes,
  validateHeaderRowProjectSelection,
} from '@/domain/crm/spreadsheetImportProjectHeaderDetection';

const SAMPLE: string[][] = [
  ['Oak Ridge Apartments', '', '', ''],
  ['Unit', 'Status', 'Contact', 'Phone'],
  ['101', 'Active', 'Sarah', '555-0101'],
  ['102', 'Pending', 'John', '555-0102'],
  ['103', 'Active', 'Amy', '555-0103'],
  ['Maple Grove', '', '', ''],
  ['201', 'Active', 'Lisa', '555-0201'],
  ['202', 'Active', 'Mike', '555-0202'],
];

describe('spreadsheetImportProjectHeaderDetection', () => {
  it('derives Project names by joining non-empty cells in order', () => {
    assert.equal(deriveProjectNameFromHeaderRow(['Oak Ridge', '', 'Phase 1']), 'Oak Ridge Phase 1');
    assert.equal(deriveProjectNameFromHeaderRow(['', '  ', '']), '');
  });

  it('suggests sparse title rows followed by denser data', () => {
    const suggested = suggestProjectHeaderRowIndexes(SAMPLE, 1);
    assert.deepEqual(suggested, [0, 5]);
  });

  it('never suggests the confirmed column-header row', () => {
    const suggested = suggestProjectHeaderRowIndexes(SAMPLE, 0);
    assert.ok(!suggested.includes(0));
  });

  it('scores sparse title rows higher than data rows', () => {
    const title = scoreProjectHeaderCandidate(SAMPLE[0]!, SAMPLE.slice(1, 5));
    const data = scoreProjectHeaderCandidate(SAMPLE[2]!, SAMPLE.slice(3, 6));
    assert.ok(title > data);
  });

  it('builds group boundaries from selected headers', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.groupId, projectHeaderGroupId(0));
    assert.equal(groups[0]!.displayName, 'Oak Ridge Apartments');
    assert.deepEqual(groups[0]!.childRowIndexes, [2, 3, 4]);
    assert.equal(groups[1]!.displayName, 'Maple Grove');
    assert.deepEqual(groups[1]!.childRowIndexes, [6, 7]);
  });

  it('applies edited Project names without mutating source cells', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0],
      nameOverrides: { 0: 'Custom Oak' },
    });
    assert.equal(groups[0]!.sourceDisplayName, 'Oak Ridge Apartments');
    assert.equal(groups[0]!.displayName, 'Custom Oak');
    assert.equal(SAMPLE[0]![0], 'Oak Ridge Apartments');
  });

  it('reports unassigned rows before the first Project header', () => {
    const unassigned = listUnassignedRowsBeforeFirstProjectHeader({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
    });
    // Rows 0,2,3,4 are before Maple Grove (row 5); column header 1 excluded; 0 is non-blank
    assert.deepEqual(unassigned, [0, 2, 3, 4]);
  });

  it('excludes unassigned rows from the unassigned report when marked excluded', () => {
    const unassigned = listUnassignedRowsBeforeFirstProjectHeader({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [5],
      excludedRowIndexes: [0, 2, 3, 4],
    });
    assert.deepEqual(unassigned, []);
  });

  it('requires at least one Project header with a usable name', () => {
    const empty = validateHeaderRowProjectSelection({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [],
    });
    assert.equal(empty.ok, false);
    assert.equal(empty.hasAtLeastOneHeader, false);

    const valid = validateHeaderRowProjectSelection({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    assert.equal(valid.ok, true);

    const missingName = validateHeaderRowProjectSelection({
      matrix: [['', '', ''], ['A', 'B'], ['1', '2']],
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0],
    });
    assert.equal(missingName.ok, false);
    assert.equal(missingName.allHeadersHaveNames, false);
  });

  it('does not treat Project header rows as child Subproject rows', () => {
    const groups = buildHeaderRowProjectGroups({
      matrix: SAMPLE,
      columnHeaderRowIndex: 1,
      selectedHeaderRowIndexes: [0, 5],
    });
    for (const group of groups) {
      assert.ok(!group.childRowIndexes.includes(group.headerRowIndex));
      assert.ok(!group.childRowIndexes.includes(5) || group.headerRowIndex === 5);
    }
    assert.ok(!groups[0]!.childRowIndexes.includes(5));
  });
});
