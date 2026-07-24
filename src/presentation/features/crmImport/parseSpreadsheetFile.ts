'use client';

import * as XLSX from 'xlsx';
import { clampImportCell, clampImportHeader } from '@/domain/crm/spreadsheetImportGrouping';
import {
  detectSpreadsheetHeaderRowIndex,
  summarizeSpreadsheetSheet,
  type SpreadsheetSheetSummary,
} from '@/domain/crm/spreadsheetImportHeaderDetection';
import {
  SPREADSHEET_IMPORT_MAX_COLUMNS,
  SPREADSHEET_IMPORT_MAX_FILE_BYTES,
  SPREADSHEET_IMPORT_MAX_ROWS,
} from '@/domain/crm/spreadsheetImportLimits';
import type { CrmImportParsedRow } from '@/domain/crm/spreadsheetImportTypes';

export type ParsedSpreadsheetFile = {
  readonly sheetNames: readonly string[];
  readonly workbook: XLSX.WorkBook;
  readonly defaultSheetName: string;
  readonly sheetSummaries: readonly SpreadsheetSheetSummary[];
  /** Suggested 0-based header row for the default sheet. */
  readonly suggestedHeaderRowIndex: number;
};

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return clampImportCell(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return clampImportCell(String(value));
  }
  if (value instanceof Date) {
    return clampImportCell(value.toISOString());
  }
  return clampImportCell(String(value));
}

async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

/** Matrix includes blank rows so spreadsheet row numbers stay stable. */
export function sheetToMatrix(workbook: XLSX.WorkBook, sheetName: string): string[][] {
  const sheet = workbook.Sheets[sheetName];
  if (sheet == null) return [];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true,
  });
  return matrix.map((row) => row.map((cell) => cellToString(cell)));
}

export function getSheetSummary(
  workbook: XLSX.WorkBook,
  sheetName: string
): SpreadsheetSheetSummary {
  return summarizeSpreadsheetSheet(sheetName, sheetToMatrix(workbook, sheetName));
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetFile> {
  if (file.size > SPREADSHEET_IMPORT_MAX_FILE_BYTES) {
    throw new Error(
      `File is too large. Maximum size is ${Math.round(SPREADSHEET_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB.`
    );
  }

  const workbook = await readWorkbookFromFile(file);
  const sheetNames = workbook.SheetNames.filter((name) => name.trim().length > 0);
  if (sheetNames.length === 0) {
    throw new Error('No worksheets found in this file.');
  }

  const sheetSummaries = sheetNames.map((name) => getSheetSummary(workbook, name));
  const defaultSheetName = sheetNames[0]!;
  const defaultMatrix = sheetToMatrix(workbook, defaultSheetName);
  const suggestedHeaderRowIndex = detectSpreadsheetHeaderRowIndex(defaultMatrix);

  return {
    sheetNames,
    workbook,
    defaultSheetName,
    sheetSummaries,
    suggestedHeaderRowIndex,
  };
}

export async function parseSheetToImportRows(
  workbookOrFile: XLSX.WorkBook | File,
  sheetName: string,
  headerRowIndex: number
): Promise<{
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly truncated?: boolean;
}> {
  const workbook =
    workbookOrFile instanceof File ? await readWorkbookFromFile(workbookOrFile) : workbookOrFile;

  const matrix = sheetToMatrix(workbook, sheetName);
  if (matrix.length === 0) {
    throw new Error('Selected sheet is empty.');
  }
  if (headerRowIndex < 0 || headerRowIndex >= matrix.length) {
    throw new Error('Header row is out of range.');
  }

  const headerRow = matrix[headerRowIndex] ?? [];
  const headers = headerRow
    .slice(0, SPREADSHEET_IMPORT_MAX_COLUMNS)
    .map((header, index) => clampImportHeader(header || `Column ${index + 1}`));

  const dataRows = matrix.slice(headerRowIndex + 1).filter((row) =>
    row.some((cell) => cell.trim() !== '')
  );
  const maxRows = SPREADSHEET_IMPORT_MAX_ROWS;
  const truncated = dataRows.length > maxRows;
  const limitedRows = truncated ? dataRows.slice(0, maxRows) : dataRows;

  const rows: CrmImportParsedRow[] = limitedRows.map((row, offset) => {
    const cells: Record<number, string> = {};
    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
      cells[colIndex] = clampImportCell(cellToString(row[colIndex] ?? ''));
    }
    return {
      sourceRowIndex: headerRowIndex + 1 + offset,
      cells,
    };
  });

  return { headers, rows, truncated: truncated || undefined };
}
