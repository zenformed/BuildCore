import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { suggestFieldPlacementFromGroupConsistency } from './spreadsheetImportFieldPlacement';

describe('spreadsheetImportFieldPlacement', () => {
  it('suggests project when values are consistent within each group', () => {
    const rows = new Map<number, Record<number, string>>([
      [1, { 0: 'Oak', 1: '100 Main' }],
      [2, { 0: 'Oak', 1: '100 Main' }],
      [3, { 0: 'Pine', 1: '200 Oak' }],
      [4, { 0: 'Pine', 1: '200 Oak' }],
    ]);
    const placement = suggestFieldPlacementFromGroupConsistency({
      groups: [
        { sourceRowIndexes: [1, 2] },
        { sourceRowIndexes: [3, 4] },
      ],
      rowsBySourceIndex: rows,
      columnIndex: 1,
    });
    assert.equal(placement, 'project');
  });

  it('suggests subproject when values differ within a group', () => {
    const rows = new Map<number, Record<number, string>>([
      [1, { 0: 'Oak', 1: '100 Main' }],
      [2, { 0: 'Oak', 1: '200 Main' }],
    ]);
    const placement = suggestFieldPlacementFromGroupConsistency({
      groups: [{ sourceRowIndexes: [1, 2] }],
      rowsBySourceIndex: rows,
      columnIndex: 1,
    });
    assert.equal(placement, 'subproject');
  });
});
