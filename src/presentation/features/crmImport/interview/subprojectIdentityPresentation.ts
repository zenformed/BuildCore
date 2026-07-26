/**
 * Pure helpers for the Subproject identity interview screen presentation.
 */

import {
  composeImportColumnValues,
  composeImportNameExample,
  type CrmImportColumnComposition,
} from '@/domain/crm/spreadsheetImportComposition';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import type {
  SubprojectIdentityGuidance,
  SubprojectIdentityGuidanceKind,
} from '@/domain/crm/spreadsheetImportSubprojectIdentityGuidance';

export const SUBPROJECT_IDENTITY_LIVE_EXAMPLE_LIMIT = 3;
export const SUBPROJECT_IDENTITY_PREVIEW_LIMIT = 3;
export const SUBPROJECT_IDENTITY_EXAMPLE_ROW_LIMIT = 4;
export const SUBPROJECT_IDENTITY_SAMPLE_ROWS_PER_GROUP = 3;

/** Same high-cardinality thresholds as Project identity (visual parity). */
const WOULD_CREATE_UNIQUE_RATIO = 0.85;
const WOULD_CREATE_MIN_COUNT = 8;

export type SubprojectIdentityLiveExamples = {
  readonly examples: readonly string[];
  readonly remainingCount: number;
};

export type SubprojectIdentityGroup = {
  readonly groupKey: string;
  readonly displayName: string;
  readonly rowCount: number;
  readonly sourceRowIndexes: readonly number[];
};

export type SubprojectIdentityPreviewGroup = {
  readonly key: string;
  readonly displayName: string;
  readonly rowCount: number;
  readonly sampleRowLabels: readonly string[];
  /** Optional companion cell for preview context (unused — name-only preview). */
  readonly companionLabels: readonly string[];
};

export type SubprojectIdentityExampleColumn = {
  readonly key: string;
  readonly label: string;
  readonly sourceIndex: number | null;
};

export type SubprojectIdentityExampleRow = {
  readonly key: string;
  readonly cells: readonly string[];
};

export type SubprojectIdentityGuidanceView = {
  readonly kind: Exclude<SubprojectIdentityGuidanceKind, 'none'> | 'would_create';
  readonly title: string;
  readonly body: string;
  readonly tone: 'success' | 'warning';
};

export type SubprojectIdentityCopy = {
  readonly guidanceUniqueTitle: string;
  readonly guidanceUniqueBody: string;
  readonly guidanceDuplicatesTitle: (count: number) => string;
  readonly guidanceDuplicatesBody: string;
  readonly guidanceBlankTitle: string;
  readonly guidanceBlankBody: string;
  readonly guidanceWeakSingleTitle: (header: string) => string;
  readonly guidanceWeakSingleBody: string;
  readonly warningWouldCreateTitle: (count: number) => string;
  readonly warningWouldCreateBody: string;
};

export function shouldShowSubprojectIdentityCombineControl(selectedColumnCount: number): boolean {
  return selectedColumnCount >= 2;
}

export function subprojectIdentityColumnRowClass(input: {
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly styles: {
    readonly row: string;
    readonly selected: string;
    readonly disabled: string;
  };
}): string {
  return [
    input.styles.row,
    input.selected ? input.styles.selected : '',
    input.disabled ? input.styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function toggleSubprojectIdentityColumn(
  selectedIndexes: readonly number[],
  index: number
): readonly number[] {
  return selectedIndexes.includes(index)
    ? selectedIndexes.filter((value) => value !== index)
    : [...selectedIndexes, index];
}

export function moveSubprojectIdentityColumn(
  selectedIndexes: readonly number[],
  index: number,
  direction: -1 | 1
): readonly number[] {
  const position = selectedIndexes.indexOf(index);
  if (position < 0) return selectedIndexes;
  const target = position + direction;
  if (target < 0 || target >= selectedIndexes.length) return selectedIndexes;
  const next = [...selectedIndexes];
  const tmp = next[position]!;
  next[position] = next[target]!;
  next[target] = tmp;
  return next;
}

/** Move `fromIndex` so it sits at the same selection-order position as `toIndex`. */
export function reorderSubprojectIdentityColumns(
  selectedIndexes: readonly number[],
  fromIndex: number,
  toIndex: number
): readonly number[] {
  const fromPos = selectedIndexes.indexOf(fromIndex);
  const toPos = selectedIndexes.indexOf(toIndex);
  if (fromPos < 0 || toPos < 0 || fromPos === toPos) return selectedIndexes;
  const next = [...selectedIndexes];
  const [moved] = next.splice(fromPos, 1);
  next.splice(toPos, 0, moved!);
  return next;
}

/**
 * Move a selected row up/down in the visible list and sync combine order.
 * Swaps with the adjacent list row so the physical list matches the arrows.
 */
export function moveSubprojectIdentityListRow(input: {
  readonly listOrder: readonly number[];
  readonly selectedIndexes: readonly number[];
  readonly index: number;
  readonly direction: -1 | 1;
}): {
  readonly listOrder: readonly number[];
  readonly selectedIndexes: readonly number[];
} {
  const position = input.listOrder.indexOf(input.index);
  if (position < 0 || !input.selectedIndexes.includes(input.index)) {
    return { listOrder: input.listOrder, selectedIndexes: input.selectedIndexes };
  }
  const target = position + input.direction;
  if (target < 0 || target >= input.listOrder.length) {
    return { listOrder: input.listOrder, selectedIndexes: input.selectedIndexes };
  }

  const nextList = [...input.listOrder];
  const tmp = nextList[position]!;
  nextList[position] = nextList[target]!;
  nextList[target] = tmp;

  const selectedSet = new Set(input.selectedIndexes);
  const nextSelected = nextList.filter((columnIndex) => selectedSet.has(columnIndex));
  return { listOrder: nextList, selectedIndexes: nextSelected };
}

export function buildSubprojectIdentityPrimaryPreview(
  sampleRows: readonly (readonly string[])[],
  composition: CrmImportColumnComposition | null
): string | null {
  if (composition == null || composition.columnIndexes.length === 0) return null;
  const examples = composeImportNameExample(sampleRows, composition, 1);
  return examples[0] ?? null;
}

export function buildSubprojectIdentityLiveExamples(input: {
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
  readonly limit?: number;
}): SubprojectIdentityLiveExamples {
  if (input.composition == null || input.composition.columnIndexes.length === 0) {
    return { examples: [], remainingCount: 0 };
  }
  const limit = input.limit ?? SUBPROJECT_IDENTITY_LIVE_EXAMPLE_LIMIT;
  const seen = new Set<string>();
  const examples: string[] = [];
  let totalUnique = 0;

  for (const row of input.dataRows) {
    const value = composeImportColumnValues(row, input.composition).trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase('en-US');
    if (seen.has(key)) continue;
    seen.add(key);
    totalUnique += 1;
    if (examples.length < limit) examples.push(value);
  }

  return {
    examples,
    remainingCount: Math.max(0, totalUnique - examples.length),
  };
}

/**
 * Group spreadsheet rows by composed Subproject name (first-seen order).
 */
export function buildSubprojectIdentityGroups(input: {
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition;
}): readonly SubprojectIdentityGroup[] {
  const byKey = new Map<
    string,
    { displayName: string; sourceRowIndexes: number[] }
  >();

  for (let rowIndex = 0; rowIndex < input.dataRows.length; rowIndex += 1) {
    const row = input.dataRows[rowIndex]!;
    const displayName = composeImportColumnValues(row, input.composition).trim();
    if (!displayName) continue;
    const groupKey = normalizeImportText(displayName);
    const existing = byKey.get(groupKey);
    if (existing == null) {
      byKey.set(groupKey, { displayName, sourceRowIndexes: [rowIndex] });
    } else {
      existing.sourceRowIndexes.push(rowIndex);
    }
  }

  return Array.from(byKey.entries()).map(([groupKey, value]) => ({
    groupKey,
    displayName: value.displayName,
    rowCount: value.sourceRowIndexes.length,
    sourceRowIndexes: value.sourceRowIndexes,
  }));
}

export function buildSubprojectIdentityPreviewGroups(input: {
  readonly groups: readonly SubprojectIdentityGroup[];
  readonly headers: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition;
  readonly limit?: number;
}): {
  readonly visible: readonly SubprojectIdentityPreviewGroup[];
  readonly remainingCount: number;
} {
  const limit = input.limit ?? SUBPROJECT_IDENTITY_PREVIEW_LIMIT;

  const visible = input.groups.slice(0, limit).map((group) => {
    const sampleRowLabels: string[] = [];
    for (const sourceRowIndex of group.sourceRowIndexes) {
      if (sampleRowLabels.length >= SUBPROJECT_IDENTITY_SAMPLE_ROWS_PER_GROUP) break;
      const row = input.dataRows[sourceRowIndex];
      if (row == null) continue;
      const label = composeImportColumnValues(row, input.composition).trim();
      if (label) sampleRowLabels.push(label);
    }
    return {
      key: group.groupKey,
      displayName: group.displayName,
      rowCount: group.rowCount,
      sampleRowLabels,
      companionLabels: [],
    };
  });
  return {
    visible,
    remainingCount: Math.max(0, input.groups.length - visible.length),
  };
}

/** Prefer a non-identity companion column for example tables (never Email). */
function pickSubprojectExampleColumnIndexes(
  headers: readonly string[],
  compositionIndexes: readonly number[]
): number[] {
  const excluded = new Set(compositionIndexes);

  const fallbackPatterns: RegExp[] = [
    /\b(phone|mobile|cell)\b/i,
    /\b(city)\b/i,
    /\b(address)\b/i,
  ];
  for (const pattern of fallbackPatterns) {
    const index = headers.findIndex(
      (header, i) => pattern.test(header) && !excluded.has(i)
    );
    if (index >= 0) return [index];
  }

  for (let i = 0; i < headers.length; i += 1) {
    if (excluded.has(i)) continue;
    // Skip email columns in preview/example companions.
    if (/\b(e[\s-]?mail)\b/i.test(headers[i] ?? '')) continue;
    return [i];
  }
  return [];
}

export function buildSubprojectIdentityExampleTable(input: {
  readonly headers: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition;
  readonly composedNameLabel: string;
  readonly limit?: number;
}): {
  readonly columns: readonly SubprojectIdentityExampleColumn[];
  readonly rows: readonly SubprojectIdentityExampleRow[];
} {
  const limit = input.limit ?? SUBPROJECT_IDENTITY_EXAMPLE_ROW_LIMIT;
  const extraIndexes = pickSubprojectExampleColumnIndexes(
    input.headers,
    input.composition.columnIndexes
  );
  const columns: SubprojectIdentityExampleColumn[] = [
    {
      key: 'composed',
      label: input.composedNameLabel,
      sourceIndex: null,
    },
    ...extraIndexes.map((sourceIndex) => ({
      key: `col-${sourceIndex}`,
      label: input.headers[sourceIndex] ?? `Column ${sourceIndex + 1}`,
      sourceIndex,
    })),
  ];

  const rows: SubprojectIdentityExampleRow[] = [];
  for (let i = 0; i < input.dataRows.length && rows.length < limit; i += 1) {
    const row = input.dataRows[i]!;
    const composed = composeImportColumnValues(row, input.composition).trim();
    if (!composed) continue;
    rows.push({
      key: `row-${i}`,
      cells: [
        composed,
        ...extraIndexes.map((sourceIndex) => String(row[sourceIndex] ?? '').trim()),
      ],
    });
  }

  return { columns, rows };
}

export function buildSubprojectIdentityGuidanceView(
  guidance: SubprojectIdentityGuidance,
  copy: SubprojectIdentityCopy
): SubprojectIdentityGuidanceView | null {
  if (guidance.kind === 'none') return null;

  const uniqueRatio =
    guidance.totalRows > 0 ? guidance.uniqueNameCount / guidance.totalRows : 0;
  if (
    guidance.kind === 'unique' &&
    uniqueRatio >= WOULD_CREATE_UNIQUE_RATIO &&
    guidance.uniqueNameCount >= WOULD_CREATE_MIN_COUNT
  ) {
    return {
      kind: 'would_create',
      title: copy.warningWouldCreateTitle(guidance.uniqueNameCount),
      body: copy.warningWouldCreateBody,
      tone: 'warning',
    };
  }

  switch (guidance.kind) {
    case 'unique':
      return {
        kind: 'unique',
        title: copy.guidanceUniqueTitle,
        body: copy.guidanceUniqueBody,
        tone: 'success',
      };
    case 'duplicates':
      return {
        kind: 'duplicates',
        title: copy.guidanceDuplicatesTitle(guidance.duplicateNameCount),
        body: copy.guidanceDuplicatesBody,
        tone: 'warning',
      };
    case 'blank_names':
      return {
        kind: 'blank_names',
        title: copy.guidanceBlankTitle,
        body: copy.guidanceBlankBody,
        tone: 'warning',
      };
    case 'weak_single_column':
      return {
        kind: 'weak_single_column',
        title: copy.guidanceWeakSingleTitle(guidance.selectedHeaderLabel || 'This column'),
        body: copy.guidanceWeakSingleBody,
        tone: 'warning',
      };
    default:
      return null;
  }
}

/** Mirrors CSS breakpoints for stacked layout tests. */
export type SubprojectIdentityLayoutMode = 'desktop' | 'stacked';

export function resolveSubprojectIdentityLayoutMode(viewportWidth: number): SubprojectIdentityLayoutMode {
  return viewportWidth <= 900 ? 'stacked' : 'desktop';
}
