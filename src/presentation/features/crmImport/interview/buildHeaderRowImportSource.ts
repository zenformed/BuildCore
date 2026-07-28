/**
 * Build a master-hierarchy import source from Project section-header groups.
 * Child rows become Subprojects; Project header rows are never imported as rows.
 */

import { clampImportHeader } from '@/domain/crm/spreadsheetImportGrouping';
import type { HeaderRowProjectGroup } from '@/domain/crm/spreadsheetImportProjectHeaderDetection';
import type { CrmImportParsedRow } from '@/domain/crm/spreadsheetImportTypes';
import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  includedWorksheetConfigs,
  worksheetParentDisplayName,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

export function buildHeaderRowImportSource(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly sheetName: string;
  readonly groups: readonly HeaderRowProjectGroup[];
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): {
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly sheetName: string;
  readonly headerRowIndex: number;
} {
  const headerCells = input.matrix[input.columnHeaderRowIndex] ?? [];
  const headers = headerCells.map((cell, index) =>
    clampImportHeader(cell.trim() || `Column ${index + 1}`)
  );
  const parentColumnIndex = headers.length;
  const importing = includedWorksheetConfigs(input.configs).filter(
    (config) => input.resolutions[config.worksheetId]?.kind !== 'skip'
  );
  if (importing.length === 0) {
    throw new Error('Select at least one Project group to import.');
  }

  const groupsById = new Map(input.groups.map((group) => [group.groupId, group]));
  const combined: CrmImportParsedRow[] = [];

  for (const config of importing) {
    const group = groupsById.get(config.worksheetId);
    if (group == null) continue;
    const resolution = input.resolutions[config.worksheetId];
    const parentName = worksheetParentDisplayName(config, resolution);

    for (const rowIndex of group.childRowIndexes) {
      // Never import the Project header row as a Subproject.
      if (rowIndex === group.headerRowIndex) continue;
      if (rowIndex === input.columnHeaderRowIndex) continue;

      const row = input.matrix[rowIndex] ?? [];
      const cells: Record<number, string> = {};
      for (let c = 0; c < headers.length; c += 1) {
        cells[c] = row[c] ?? '';
      }
      cells[parentColumnIndex] = parentName;
      combined.push({
        sourceRowIndex: rowIndex,
        cells,
      });
    }
  }

  return {
    headers,
    rows: combined,
    sheetName: input.sheetName,
    headerRowIndex: input.columnHeaderRowIndex,
  };
}
