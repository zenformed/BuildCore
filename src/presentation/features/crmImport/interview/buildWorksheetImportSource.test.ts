import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx';
import { buildWorksheetImportSource } from '@/presentation/features/crmImport/interview/buildWorksheetImportSource';
import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import type { WorksheetResolutionDraft } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

function sheetConfig(
  worksheetId: string,
  worksheetName: string,
  projectName: string
): WorksheetProjectConfig {
  return {
    worksheetId,
    worksheetName,
    included: true,
    projectName,
    headerRowIndex: 0,
    dataRowCount: 2,
    columnCount: 2,
  };
}

describe('buildWorksheetImportSource', () => {
  it('combines importing worksheets additively with injected parent names', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Unit', 'City'],
        ['1', 'Seattle'],
        ['2', 'Seattle'],
      ]),
      'Oak'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Unit', 'City'],
        ['3', 'Tacoma'],
        ['4', 'Tacoma'],
        ['5', 'Tacoma'],
      ]),
      'Maple'
    );

    const configs = [
      sheetConfig('sheet:0:Oak', 'Oak', 'Oak Ridge'),
      sheetConfig('sheet:1:Maple', 'Maple', 'Maple Grove'),
    ];
    const resolutions: Record<string, WorksheetResolutionDraft> = {
      'sheet:0:Oak': {
        kind: 'create_new',
        existingProjectId: null,
        existingProjectLabel: null,
        confirmed: true,
      },
      'sheet:1:Maple': {
        kind: 'attach_existing',
        existingProjectId: 'proj-maple',
        existingProjectLabel: 'Maple Grove',
        confirmed: true,
      },
    };

    const combined = await buildWorksheetImportSource({ workbook, configs, resolutions });
    assert.equal(combined.rows.length, 5);
    assert.equal(combined.sheetName, '2 worksheets');
    assert.equal(combined.rows[0]?.cells[2], 'Oak Ridge');
    assert.equal(combined.rows[2]?.cells[2], 'Maple Grove');
    assert.notEqual(combined.rows[0]?.sourceRowIndex, combined.rows[2]?.sourceRowIndex);
  });
});
