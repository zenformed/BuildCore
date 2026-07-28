/**
 * Deterministic detection of Project section-header rows in a spreadsheet.
 * Pure helpers — no AI. Used by the header-rows import branch.
 */

import {
  scoreSpreadsheetHeaderCandidate,
  toUserFacingSpreadsheetRowNumber,
} from '@/domain/crm/spreadsheetImportHeaderDetection';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export const SPREADSHEET_PROJECT_HEADER_DETECT_MAX_SCAN_ROWS = 200;

function isBlankRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function nonEmptyCells(row: readonly string[]): string[] {
  return row.map((c) => c.trim()).filter((c) => c.length > 0);
}

function filledCount(row: readonly string[]): number {
  return nonEmptyCells(row).length;
}

/**
 * Derive a Project display name from a section-header row.
 * Combines non-empty cells in spreadsheet order with a space.
 */
export function deriveProjectNameFromHeaderRow(row: readonly string[]): string {
  return nonEmptyCells(row).join(' ').replace(/\s+/g, ' ').trim();
}

export function projectHeaderGroupId(headerRowIndex: number): string {
  return `hr:${headerRowIndex}`;
}

export type ProjectHeaderCandidateScore = {
  readonly index: number;
  readonly score: number;
};

/**
 * Score how likely a row is a Project section title (not a column-header row).
 * Higher = more likely a section header.
 */
export function scoreProjectHeaderCandidate(
  row: readonly string[],
  followingRows: readonly (readonly string[])[]
): number {
  const cells = nonEmptyCells(row);
  if (cells.length === 0) return -1000;

  // Column-header-like rows are poor section titles.
  const columnHeaderScore = scoreSpreadsheetHeaderCandidate(row);
  if (columnHeaderScore >= 40 && cells.length >= 3) {
    return -80;
  }

  let score = 0;
  const filled = cells.length;

  // Sparse title rows (1–2 populated cells) are classic section headers.
  if (filled === 1) score += 55;
  else if (filled === 2) score += 35;
  else score -= filled * 8;

  const avgLen = cells.reduce((sum, c) => sum + c.length, 0) / cells.length;
  if (avgLen >= 8 && avgLen <= 60) score += 12;
  if (avgLen > 80) score -= 15;

  // Prefer text-only sparse rows over numeric data.
  const numericLike = cells.filter((c) => /^[$€£]?\s*-?\d[\d,]*(?:\.\d+)?%?$/.test(c)).length;
  if (numericLike === 0) score += 10;
  else score -= numericLike * 15;

  // Followed by denser data rows strengthens the signal.
  const sample = followingRows.slice(0, 5).filter((r) => !isBlankRow(r));
  if (sample.length >= 2) {
    const avgFollowing = sample.reduce((sum, r) => sum + filledCount(r), 0) / sample.length;
    if (avgFollowing > filled + 0.5) score += 28;
    else if (avgFollowing > filled) score += 12;
  } else if (sample.length === 0) {
    score -= 20;
  }

  return score;
}

/**
 * Suggest 0-based Project section-header row indexes.
 * Excludes the confirmed column-header row. Blank rows are never suggested.
 */
export function suggestProjectHeaderRowIndexes(
  matrix: readonly (readonly string[])[],
  columnHeaderRowIndex: number,
  options?: { readonly maxScanRows?: number; readonly minScore?: number }
): readonly number[] {
  if (matrix.length === 0) return [];

  const maxScan = Math.min(
    options?.maxScanRows ?? SPREADSHEET_PROJECT_HEADER_DETECT_MAX_SCAN_ROWS,
    matrix.length
  );
  const minScore = options?.minScore ?? 40;
  const suggested: number[] = [];

  for (let i = 0; i < maxScan; i += 1) {
    if (i === columnHeaderRowIndex) continue;
    const row = matrix[i] ?? [];
    if (isBlankRow(row)) continue;

    const following = matrix.slice(i + 1, Math.min(i + 6, matrix.length));
    const score = scoreProjectHeaderCandidate(row, following);
    if (score >= minScore) {
      suggested.push(i);
    }
  }

  // Prefer a repeated sparse pattern: if multiple candidates share the same
  // filled-count shape, keep them; otherwise keep the top-scoring set as-is.
  return suggested;
}

export type HeaderRowProjectGroup = {
  readonly groupId: string;
  readonly headerRowIndex: number;
  /** Name derived from the header row cells (immutable source). */
  readonly sourceDisplayName: string;
  /** Effective display name (override or source). */
  readonly displayName: string;
  /** 0-based child data row indexes (excludes header, column header, blanks optional). */
  readonly childRowIndexes: readonly number[];
  readonly firstChildRowIndex: number | null;
  readonly lastChildRowIndex: number | null;
};

export type BuildHeaderRowProjectGroupsInput = {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  /** Selected Project section-header rows (0-based), any order. */
  readonly selectedHeaderRowIndexes: readonly number[];
  /** Optional edited names keyed by header row index. */
  readonly nameOverrides?: Readonly<Record<number, string>>;
  /**
   * 0-based row indexes explicitly excluded from import (unassigned / skipped).
   * Excluded rows are omitted from child lists and unassigned reporting.
   */
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
};

function toExcludedSet(
  excluded: ReadonlySet<number> | readonly number[] | undefined
): ReadonlySet<number> {
  if (excluded == null) return new Set();
  if (excluded instanceof Set) return excluded;
  return new Set(excluded);
}

/**
 * Build Project groups from selected section-header rows.
 * Children are contiguous rows after each header until the next selected header
 * (or end of sheet), excluding the column-header row, other Project headers,
 * blank rows, and explicitly excluded rows.
 */
export function buildHeaderRowProjectGroups(
  input: BuildHeaderRowProjectGroupsInput
): readonly HeaderRowProjectGroup[] {
  const sortedHeaders = [...new Set(input.selectedHeaderRowIndexes)]
    .filter((index) => index >= 0 && index < input.matrix.length)
    .filter((index) => index !== input.columnHeaderRowIndex)
    .sort((a, b) => a - b);

  const excluded = toExcludedSet(input.excludedRowIndexes);
  const headerSet = new Set(sortedHeaders);
  const groups: HeaderRowProjectGroup[] = [];

  for (let h = 0; h < sortedHeaders.length; h += 1) {
    const headerRowIndex = sortedHeaders[h]!;
    const nextHeader = sortedHeaders[h + 1];
    const rangeEnd = nextHeader ?? input.matrix.length;
    const childRowIndexes: number[] = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex < rangeEnd; rowIndex += 1) {
      if (rowIndex === input.columnHeaderRowIndex) continue;
      if (headerSet.has(rowIndex)) continue;
      if (excluded.has(rowIndex)) continue;
      if (isBlankRow(input.matrix[rowIndex] ?? [])) continue;
      childRowIndexes.push(rowIndex);
    }

    const sourceDisplayName = deriveProjectNameFromHeaderRow(
      input.matrix[headerRowIndex] ?? []
    );
    const override = input.nameOverrides?.[headerRowIndex];
    const displayName =
      override != null && normalizeImportText(override)
        ? override.trim().replace(/\s+/g, ' ')
        : sourceDisplayName;

    groups.push({
      groupId: projectHeaderGroupId(headerRowIndex),
      headerRowIndex,
      sourceDisplayName,
      displayName,
      childRowIndexes,
      firstChildRowIndex: childRowIndexes[0] ?? null,
      lastChildRowIndex: childRowIndexes[childRowIndexes.length - 1] ?? null,
    });
  }

  return groups;
}

/**
 * Non-blank, non-excluded rows that appear before the first selected Project header
 * and are not the column-header row.
 */
export function listUnassignedRowsBeforeFirstProjectHeader(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): readonly number[] {
  const sortedHeaders = [...new Set(input.selectedHeaderRowIndexes)]
    .filter((index) => index >= 0 && index < input.matrix.length)
    .filter((index) => index !== input.columnHeaderRowIndex)
    .sort((a, b) => a - b);

  if (sortedHeaders.length === 0) return [];

  const firstHeader = sortedHeaders[0]!;
  const excluded = toExcludedSet(input.excludedRowIndexes);
  const unassigned: number[] = [];

  for (let i = 0; i < firstHeader; i += 1) {
    if (i === input.columnHeaderRowIndex) continue;
    if (excluded.has(i)) continue;
    if (isBlankRow(input.matrix[i] ?? [])) continue;
    unassigned.push(i);
  }

  return unassigned;
}

/**
 * Non-blank data rows after the column header that are not Project headers,
 * not in any group, and not excluded — typically should be empty when valid.
 */
export function listOrphanDataRowsOutsideGroups(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly groups: readonly HeaderRowProjectGroup[];
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): readonly number[] {
  const excluded = toExcludedSet(input.excludedRowIndexes);
  const covered = new Set<number>();
  for (const group of input.groups) {
    covered.add(group.headerRowIndex);
    for (const child of group.childRowIndexes) covered.add(child);
  }
  for (const header of input.selectedHeaderRowIndexes) covered.add(header);

  const orphans: number[] = [];
  for (let i = 0; i < input.matrix.length; i += 1) {
    if (i === input.columnHeaderRowIndex) continue;
    if (excluded.has(i)) continue;
    if (covered.has(i)) continue;
    if (isBlankRow(input.matrix[i] ?? [])) continue;
    orphans.push(i);
  }
  return orphans;
}

export type HeaderRowProjectGroupsValidation = {
  readonly ok: boolean;
  readonly hasAtLeastOneHeader: boolean;
  readonly allHeadersHaveNames: boolean;
  readonly unassignedBeforeFirstCount: number;
  readonly orphanOutsideGroupsCount: number;
  readonly duplicateHeaders: boolean;
};

export function validateHeaderRowProjectSelection(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly nameOverrides?: Readonly<Record<number, string>>;
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): HeaderRowProjectGroupsValidation {
  const unique = [...new Set(input.selectedHeaderRowIndexes)];
  const duplicateHeaders = unique.length !== input.selectedHeaderRowIndexes.length;
  const groups = buildHeaderRowProjectGroups(input);
  const unassigned = listUnassignedRowsBeforeFirstProjectHeader(input);
  const orphans = listOrphanDataRowsOutsideGroups({
    ...input,
    groups,
  });

  const hasAtLeastOneHeader = groups.length > 0;
  const allHeadersHaveNames = groups.every((group) =>
    Boolean(normalizeImportText(group.displayName))
  );

  return {
    ok:
      hasAtLeastOneHeader &&
      allHeadersHaveNames &&
      !duplicateHeaders &&
      unassigned.length === 0 &&
      orphans.length === 0,
    hasAtLeastOneHeader,
    allHeadersHaveNames,
    unassignedBeforeFirstCount: unassigned.length,
    orphanOutsideGroupsCount: orphans.length,
    duplicateHeaders,
  };
}

export function formatHeaderRowRangeLabel(group: HeaderRowProjectGroup): string | null {
  if (group.firstChildRowIndex == null || group.lastChildRowIndex == null) return null;
  const start = toUserFacingSpreadsheetRowNumber(group.firstChildRowIndex);
  const end = toUserFacingSpreadsheetRowNumber(group.lastChildRowIndex);
  if (start === end) return `Row ${start}`;
  return `Rows ${start}–${end}`;
}

/** Preview values from the first few child rows (prefer fuller name-like labels). */
export function previewChildValuesForGroup(
  matrix: readonly (readonly string[])[],
  group: HeaderRowProjectGroup,
  limit = 3
): readonly string[] {
  const values: string[] = [];
  for (const rowIndex of group.childRowIndexes) {
    if (values.length >= limit) break;
    const cells = nonEmptyCells(matrix[rowIndex] ?? []);
    const label = previewLabelFromRowCells(cells);
    if (label) values.push(label.length > 64 ? `${label.slice(0, 61)}…` : label);
  }
  return values;
}

function looksNameLikeCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^[$€£]?\s*-?\d[\d,]*(?:\.\d+)?%?$/.test(trimmed)) return false;
  if (
    /^\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?$/.test(trimmed) ||
    /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/.test(trimmed)
  ) {
    return false;
  }
  // Phone-like values are poor preview labels.
  if (/^\+?[\d\s().-]{7,}$/.test(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed);
}

/** Prefer combined name-like cells (e.g. first + last) over a lone ID/code cell. */
function previewLabelFromRowCells(cells: readonly string[]): string {
  if (cells.length === 0) return '';
  const namey = cells.filter(looksNameLikeCell);
  if (namey.length >= 2) return `${namey[0]} ${namey[1]}`.replace(/\s+/g, ' ').trim();
  if (namey.length === 1) return namey[0]!;
  return cells[0]!;
}
