import * as XLSX from 'xlsx';
import type { OrganizationExportWorkbook } from './organizationExportTypes';

const MAX_SHEET_NAME_LENGTH = 31;

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet';
  return cleaned.slice(0, MAX_SHEET_NAME_LENGTH);
}

export function renderOrganizationExportWorkbook(workbook: OrganizationExportWorkbook): Buffer {
  const xlsxWorkbook = XLSX.utils.book_new();

  for (const sheet of workbook.sheets) {
    const rows: string[][] = [
      [...sheet.headers],
      ...sheet.rows.map((row) => [...row]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(xlsxWorkbook, worksheet, sanitizeSheetName(sheet.name));
  }

  return Buffer.from(
    XLSX.write(xlsxWorkbook, { type: 'buffer', bookType: 'xlsx', compression: true })
  );
}

export function renderOrganizationExportBlob(workbook: OrganizationExportWorkbook): Blob {
  const buffer = renderOrganizationExportWorkbook(workbook);
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
