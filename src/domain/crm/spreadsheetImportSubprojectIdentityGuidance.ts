/**
 * Deterministic guidance for Subproject-identifying column selections.
 * Does not change grouping or import payloads — UI analysis only.
 */

import {
  composeImportColumnValues,
  type CrmImportColumnComposition,
} from '@/domain/crm/spreadsheetImportComposition';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export type SubprojectIdentityGuidanceKind =
  | 'none'
  | 'unique'
  | 'duplicates'
  | 'blank_names'
  | 'weak_single_column';

export type SubprojectIdentityGuidance = {
  readonly kind: SubprojectIdentityGuidanceKind;
  readonly severity: 'none' | 'success' | 'warning';
  readonly totalRows: number;
  readonly uniqueNameCount: number;
  readonly duplicateNameCount: number;
  readonly blankRowCount: number;
  readonly selectedHeaderLabel: string;
};

const FIRST_NAME_HEADER_RE = /\b(first\s*name|firstname|given\s*name|fname)\b/i;

function joinedHeader(headers: readonly string[], indexes: readonly number[]): string {
  return indexes.map((index) => headers[index] ?? '').join(' + ');
}

/**
 * Analyze selected Subproject identity columns against spreadsheet data rows.
 */
export function analyzeSubprojectIdentitySelection(input: {
  readonly headers: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
}): SubprojectIdentityGuidance {
  const empty: SubprojectIdentityGuidance = {
    kind: 'none',
    severity: 'none',
    totalRows: input.dataRows.length,
    uniqueNameCount: 0,
    duplicateNameCount: 0,
    blankRowCount: 0,
    selectedHeaderLabel: '',
  };

  if (input.composition == null || input.composition.columnIndexes.length === 0) {
    return empty;
  }

  const selectedHeaderLabel = joinedHeader(input.headers, input.composition.columnIndexes);
  const frequencies = new Map<string, number>();
  let blankRowCount = 0;

  for (const row of input.dataRows) {
    const raw = composeImportColumnValues(row, input.composition).trim();
    if (!raw) {
      blankRowCount += 1;
      continue;
    }
    const key = normalizeImportText(raw);
    frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  }

  let duplicateNameCount = 0;
  for (const count of frequencies.values()) {
    if (count > 1) duplicateNameCount += 1;
  }

  const uniqueNameCount = frequencies.size;
  const base = {
    totalRows: input.dataRows.length,
    uniqueNameCount,
    duplicateNameCount,
    blankRowCount,
    selectedHeaderLabel,
  };

  if (blankRowCount > 0) {
    return { ...base, kind: 'blank_names', severity: 'warning' };
  }

  if (duplicateNameCount > 0) {
    const singleColumn = input.composition.columnIndexes.length === 1;
    const header = input.headers[input.composition.columnIndexes[0]!] ?? '';
    if (singleColumn && FIRST_NAME_HEADER_RE.test(header)) {
      return { ...base, kind: 'weak_single_column', severity: 'warning' };
    }
    return { ...base, kind: 'duplicates', severity: 'warning' };
  }

  if (input.dataRows.length > 0 && uniqueNameCount > 0) {
    return { ...base, kind: 'unique', severity: 'success' };
  }

  return { ...base, kind: 'none', severity: 'none' };
}
