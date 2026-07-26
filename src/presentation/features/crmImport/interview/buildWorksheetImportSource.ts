/**
 * Combine one-Project-per-worksheet sheets into a single master-hierarchy import source.
 * Each sheet's rows get an injected parent_name cell from that worksheet's create/attach decision.
 */

import type * as XLSX from 'xlsx';
import { SPREADSHEET_IMPORT_MAX_ROWS } from '@/domain/crm/spreadsheetImportLimits';
import type { CrmImportParsedRow } from '@/domain/crm/spreadsheetImportTypes';
import { parseSheetToImportRows } from '@/presentation/features/crmImport/parseSpreadsheetFile';
import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  includedWorksheetConfigs,
  worksheetParentDisplayName,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

/** Unique sourceRowIndex space per sheet so multi-sheet rows do not collide. */
const SHEET_SOURCE_ROW_STRIDE = SPREADSHEET_IMPORT_MAX_ROWS + 1_000;

export async function buildWorksheetImportSource(input: {
  readonly workbook: XLSX.WorkBook;
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): Promise<{
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly sheetName: string;
  readonly headerRowIndex: number;
}> {
  const importing = includedWorksheetConfigs(input.configs).filter(
    (config) => input.resolutions[config.worksheetId]?.kind !== 'skip'
  );
  if (importing.length === 0) {
    throw new Error('Select at least one worksheet to import.');
  }

  const first = importing[0]!;
  const firstParsed = await parseSheetToImportRows(
    input.workbook,
    first.worksheetName,
    first.headerRowIndex
  );
  const parentColumnIndex = firstParsed.headers.length;
  const combined: CrmImportParsedRow[] = [];

  for (let sheetOrdinal = 0; sheetOrdinal < importing.length; sheetOrdinal += 1) {
    const config = importing[sheetOrdinal]!;
    const resolution = input.resolutions[config.worksheetId];
    const parentName = worksheetParentDisplayName(config, resolution);
    const parsed =
      sheetOrdinal === 0
        ? firstParsed
        : await parseSheetToImportRows(
            input.workbook,
            config.worksheetName,
            config.headerRowIndex
          );

    for (const row of parsed.rows) {
      combined.push({
        sourceRowIndex: sheetOrdinal * SHEET_SOURCE_ROW_STRIDE + row.sourceRowIndex,
        cells: {
          ...row.cells,
          [parentColumnIndex]: parentName,
        },
      });
    }
  }

  return {
    headers: firstParsed.headers,
    rows: combined,
    sheetName:
      importing.length === 1
        ? first.worksheetName
        : `${importing.length} worksheets`,
    headerRowIndex: first.headerRowIndex,
  };
}

/**
 * Combine selected worksheets under one fixed parent (one-project path).
 * Does not inject a parent_name column — the parent is chosen separately.
 */
export async function buildSelectedSheetsImportSource(input: {
  readonly workbook: XLSX.WorkBook;
  readonly configs: readonly WorksheetProjectConfig[];
}): Promise<{
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly sheetName: string;
  readonly headerRowIndex: number;
}> {
  const importing = includedWorksheetConfigs(input.configs);
  if (importing.length === 0) {
    throw new Error('Select at least one worksheet to import.');
  }

  const first = importing[0]!;
  const firstParsed = await parseSheetToImportRows(
    input.workbook,
    first.worksheetName,
    first.headerRowIndex
  );
  const combined: CrmImportParsedRow[] = [];

  for (let sheetOrdinal = 0; sheetOrdinal < importing.length; sheetOrdinal += 1) {
    const config = importing[sheetOrdinal]!;
    const parsed =
      sheetOrdinal === 0
        ? firstParsed
        : await parseSheetToImportRows(
            input.workbook,
            config.worksheetName,
            config.headerRowIndex
          );

    for (const row of parsed.rows) {
      combined.push({
        sourceRowIndex: sheetOrdinal * SHEET_SOURCE_ROW_STRIDE + row.sourceRowIndex,
        cells: { ...row.cells },
      });
    }
  }

  return {
    headers: firstParsed.headers,
    rows: combined,
    sheetName:
      importing.length === 1
        ? first.worksheetName
        : `${importing.length} worksheets`,
    headerRowIndex: first.headerRowIndex,
  };
}
