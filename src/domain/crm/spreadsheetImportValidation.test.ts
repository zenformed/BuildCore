import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSubprojectNameFromRow,
  parseImportDealValueToCents,
  validateImportRow,
} from './spreadsheetImportValidation';
import type { CrmImportColumnMapping, CrmImportParsedRow } from './spreadsheetImportTypes';

const subprojectNameMapping: CrmImportColumnMapping = {
  sourceIndex: 0,
  originalHeader: 'Unit',
  ownership: 'subproject',
  destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
};

describe('spreadsheetImportValidation', () => {
  it('parses currency values to cents', () => {
    assert.deepEqual(parseImportDealValueToCents('$1,234.50'), { ok: true, cents: 123450 });
    assert.equal(parseImportDealValueToCents('10%').ok, false);
    assert.equal(parseImportDealValueToCents('-5').ok, false);
  });

  it('reads subproject name from mapped row', () => {
    const row: CrmImportParsedRow = { sourceRowIndex: 1, cells: { 0: 'Lot 12' } };
    assert.equal(getSubprojectNameFromRow(row, [subprojectNameMapping]), 'Lot 12');
  });

  it('requires subproject name and validates email/stage', () => {
    const row: CrmImportParsedRow = {
      sourceRowIndex: 1,
      cells: { 0: '', 1: 'bad-email', 2: 'Unknown Stage' },
    };
    const mappings: CrmImportColumnMapping[] = [
      subprojectNameMapping,
      {
        sourceIndex: 1,
        originalHeader: 'Email',
        ownership: 'subproject',
        destination: { kind: 'standard_field', entity: 'subproject', key: 'emails' },
      },
      {
        sourceIndex: 2,
        originalHeader: 'Stage',
        ownership: 'subproject',
        destination: { kind: 'standard_field', entity: 'subproject', key: 'stage' },
      },
    ];

    const result = validateImportRow({
      row,
      mappings,
      allowedStageSlugs: new Set(['lead']),
    });

    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === 'missing_subproject_name'));
    assert.ok(result.issues.some((issue) => issue.code === 'invalid_email'));
    assert.ok(result.issues.some((issue) => issue.code === 'invalid_stage'));
  });

  it('warns when assignee email is unknown', () => {
    const row: CrmImportParsedRow = {
      sourceRowIndex: 1,
      cells: { 0: 'Unit 1', 1: 'missing@example.com' },
    };
    const mappings: CrmImportColumnMapping[] = [
      subprojectNameMapping,
      {
        sourceIndex: 1,
        originalHeader: 'Assignee',
        ownership: 'subproject',
        destination: { kind: 'standard_field', entity: 'subproject', key: 'assignee_email' },
      },
    ];

    const result = validateImportRow({
      row,
      mappings,
      memberEmailToId: new Map([['known@example.com', 'member-1']]),
    });

    assert.equal(result.ok, true);
    assert.ok(result.issues.some((issue) => issue.code === 'unknown_assignee_email'));
  });

  it('warns on duplicate subproject names within a group without blocking', () => {
    const row: CrmImportParsedRow = {
      sourceRowIndex: 2,
      cells: { 0: 'Unit 1' },
    };
    const result = validateImportRow({
      row,
      mappings: [subprojectNameMapping],
      duplicateNamesInGroup: new Set(['unit 1']),
    });
    assert.equal(result.ok, true);
    assert.ok(result.issues.some((issue) => issue.code === 'duplicate_subproject_name'));
  });
});
