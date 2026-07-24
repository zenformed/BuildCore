/**
 * Pure helpers for the Subproject identity interview screen presentation.
 */

import {
  composeImportColumnValues,
  composeImportNameExample,
  type CrmImportColumnComposition,
} from '@/domain/crm/spreadsheetImportComposition';
import type {
  SubprojectIdentityGuidance,
  SubprojectIdentityGuidanceKind,
} from '@/domain/crm/spreadsheetImportSubprojectIdentityGuidance';

export const SUBPROJECT_IDENTITY_LIVE_EXAMPLE_LIMIT = 3;

export type SubprojectIdentityLiveExamples = {
  readonly examples: readonly string[];
  readonly remainingCount: number;
};

export type SubprojectIdentityGuidanceView = {
  readonly kind: Exclude<SubprojectIdentityGuidanceKind, 'none'>;
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

export function buildSubprojectIdentityGuidanceView(
  guidance: SubprojectIdentityGuidance,
  copy: SubprojectIdentityCopy
): SubprojectIdentityGuidanceView | null {
  if (guidance.kind === 'none') return null;

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
