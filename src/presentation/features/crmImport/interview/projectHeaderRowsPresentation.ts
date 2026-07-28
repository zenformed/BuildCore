/**
 * Presentation helpers for the Project section-header confirmation screen
 * and conversion into the shared worksheet Project-resolution shape.
 */

import {
  buildHeaderRowProjectGroups,
  formatHeaderRowRangeLabel,
  listUnassignedRowsBeforeFirstProjectHeader,
  previewChildValuesForGroup,
  projectHeaderGroupId,
  suggestProjectHeaderRowIndexes,
  validateHeaderRowProjectSelection,
  type HeaderRowProjectGroup,
} from '@/domain/crm/spreadsheetImportProjectHeaderDetection';
import { toUserFacingSpreadsheetRowNumber } from '@/domain/crm/spreadsheetImportHeaderDetection';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import type {
  WorksheetProjectConfig,
  WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  buildDefaultWorksheetResolutions,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

export const PROJECT_HEADER_CHILD_PREVIEW_LIMIT = 3;

export type ProjectHeaderRowPreviewModel = {
  readonly group: HeaderRowProjectGroup;
  readonly rangeLabel: string | null;
  readonly childCount: number;
  readonly childPreviews: readonly string[];
  readonly childOverflowCount: number;
  readonly userFacingHeaderRow: number;
  readonly status: ProjectHeaderGroupCardStatus;
  readonly importSummaryName: string;
};

export type ProjectHeaderGroupCardStatus =
  | 'ready'
  | 'needs_review'
  | 'unassigned_rows'
  | 'invalid_name';

/**
 * Card status from existing validation signals only (name, children, unassigned rows).
 */
export function resolveProjectHeaderGroupCardStatus(input: {
  readonly displayName: string;
  readonly childCount: number;
  readonly unassignedRowCount: number;
}): ProjectHeaderGroupCardStatus {
  if (!normalizeImportText(input.displayName)) return 'invalid_name';
  if (input.unassignedRowCount > 0) return 'unassigned_rows';
  if (input.childCount <= 0) return 'needs_review';
  return 'ready';
}

export type ProjectHeaderRowsSummary = {
  readonly projectGroupCount: number;
  readonly subprojectCount: number;
  readonly unassignedRowCount: number;
};

/** Visual roles used by the confirmation spreadsheet (CSS class mapping). */
export type ProjectHeaderSpreadsheetRowKind =
  | 'column_header'
  | 'project_header'
  | 'ordinary'
  | 'unassigned'
  | 'excluded';

export const PROJECT_HEADER_GROUP_ACCENT_COUNT = 8;

/**
 * Deterministic accent slot for a Project group (0-based ordinal in display order).
 * Cycles through the shared BuildCore multi-series palette.
 */
export function projectHeaderGroupAccentIndex(groupOrdinal: number): number {
  if (groupOrdinal < 0) return 0;
  return groupOrdinal % PROJECT_HEADER_GROUP_ACCENT_COUNT;
}

export type ProjectHeaderSpreadsheetRowHighlight = {
  readonly kind: ProjectHeaderSpreadsheetRowKind;
  readonly isProjectHeader: boolean;
  readonly inActiveGroup: boolean;
  readonly isActiveHeader: boolean;
  readonly isActiveChild: boolean;
  readonly inHoverGroup: boolean;
  readonly isHoverHeader: boolean;
  readonly isHoverChild: boolean;
  readonly isUnassigned: boolean;
  /** Palette slot 0…7 for the owning Project group; null when not in a group. */
  readonly accentIndex: number | null;
  readonly isGroupFirst: boolean;
  readonly isGroupLast: boolean;
};

export function buildProjectHeaderRowPreviewModels(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly nameOverrides?: Readonly<Record<number, string>>;
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): readonly ProjectHeaderRowPreviewModel[] {
  const groups = buildHeaderRowProjectGroups(input);
  const unassignedRowCount = listUnassignedRowsBeforeFirstProjectHeader(input).length;
  return groups.map((group) => {
    const childPreviews = previewChildValuesForGroup(
      input.matrix,
      group,
      PROJECT_HEADER_CHILD_PREVIEW_LIMIT
    );
    return {
      group,
      rangeLabel: formatHeaderRowRangeLabel(group),
      childCount: group.childRowIndexes.length,
      childPreviews,
      childOverflowCount: Math.max(0, group.childRowIndexes.length - childPreviews.length),
      userFacingHeaderRow: toUserFacingSpreadsheetRowNumber(group.headerRowIndex),
      status: resolveProjectHeaderGroupCardStatus({
        displayName: group.displayName,
        childCount: group.childRowIndexes.length,
        unassignedRowCount,
      }),
      importSummaryName: group.displayName.trim() || group.sourceDisplayName.trim() || '—',
    };
  });
}

export function buildProjectHeaderRowsSummary(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly nameOverrides?: Readonly<Record<number, string>>;
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): ProjectHeaderRowsSummary {
  const groups = buildHeaderRowProjectGroups(input);
  const unassigned = listUnassignedRowsBeforeFirstProjectHeader(input);
  return {
    projectGroupCount: groups.length,
    subprojectCount: groups.reduce((sum, group) => sum + group.childRowIndexes.length, 0),
    unassignedRowCount: unassigned.length,
  };
}

export function findProjectHeaderGroupForRow(
  groups: readonly HeaderRowProjectGroup[],
  rowIndex: number
): HeaderRowProjectGroup | null {
  for (const group of groups) {
    if (group.headerRowIndex === rowIndex) return group;
    if (group.childRowIndexes.includes(rowIndex)) return group;
  }
  return null;
}

export function resolveActiveGroupId(input: {
  readonly groups: readonly HeaderRowProjectGroup[];
  readonly preferredGroupId: string | null;
}): string | null {
  if (input.groups.length === 0) return null;
  if (
    input.preferredGroupId != null &&
    input.groups.some((group) => group.groupId === input.preferredGroupId)
  ) {
    return input.preferredGroupId;
  }
  return input.groups[0]?.groupId ?? null;
}

/** Keyboard navigation between Project-group cards (ArrowUp / ArrowDown). */
export function adjacentProjectHeaderGroupId(
  groups: readonly { readonly groupId: string }[],
  currentId: string,
  direction: 'next' | 'previous'
): string | null {
  if (groups.length === 0) return null;
  const index = groups.findIndex((group) => group.groupId === currentId);
  if (index < 0) return groups[0]?.groupId ?? null;
  const nextIndex =
    direction === 'next'
      ? Math.min(groups.length - 1, index + 1)
      : Math.max(0, index - 1);
  return groups[nextIndex]?.groupId ?? null;
}

/**
 * Clicking a group card focuses it for inspection — it must not toggle
 * Project-header checkbox selection.
 */
export function shouldToggleProjectHeaderOnGroupCardClick(): boolean {
  return false;
}

/**
 * Spreadsheet row body click focuses a group for inspection when the row
 * belongs to a group; it must not toggle the Project-header checkbox.
 */
export function shouldToggleProjectHeaderOnSpreadsheetRowClick(): boolean {
  return false;
}

export function buildProjectHeaderSpreadsheetRowHighlight(input: {
  readonly rowIndex: number;
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: ReadonlySet<number> | readonly number[];
  readonly unassignedRowIndexes: ReadonlySet<number> | readonly number[];
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
  readonly activeGroup: HeaderRowProjectGroup | null;
  readonly hoverGroup: HeaderRowProjectGroup | null;
  /** Display-order groups used to resolve accent slots and first/last edges. */
  readonly groups?: readonly HeaderRowProjectGroup[];
}): ProjectHeaderSpreadsheetRowHighlight {
  const selected =
    input.selectedHeaderRowIndexes instanceof Set
      ? input.selectedHeaderRowIndexes
      : new Set(input.selectedHeaderRowIndexes);
  const unassigned =
    input.unassignedRowIndexes instanceof Set
      ? input.unassignedRowIndexes
      : new Set(input.unassignedRowIndexes);
  const excluded =
    input.excludedRowIndexes instanceof Set
      ? input.excludedRowIndexes
      : new Set(input.excludedRowIndexes ?? []);

  const isColumnHeader = input.rowIndex === input.columnHeaderRowIndex;
  const isProjectHeader = !isColumnHeader && selected.has(input.rowIndex);
  const isUnassigned = !isColumnHeader && !isProjectHeader && unassigned.has(input.rowIndex);
  const isExcluded = excluded.has(input.rowIndex);

  let kind: ProjectHeaderSpreadsheetRowKind = 'ordinary';
  if (isColumnHeader) kind = 'column_header';
  else if (isProjectHeader) kind = 'project_header';
  else if (isUnassigned) kind = 'unassigned';
  else if (isExcluded) kind = 'excluded';

  const groups = input.groups ?? [];
  const owningGroup = findProjectHeaderGroupForRow(groups, input.rowIndex);
  const accentIndex =
    owningGroup == null
      ? null
      : projectHeaderGroupAccentIndex(
          groups.findIndex((group) => group.groupId === owningGroup.groupId)
        );

  const isGroupFirst = owningGroup != null && owningGroup.headerRowIndex === input.rowIndex;
  const isGroupLast =
    owningGroup != null &&
    (owningGroup.childRowIndexes.length === 0
      ? owningGroup.headerRowIndex === input.rowIndex
      : owningGroup.childRowIndexes[owningGroup.childRowIndexes.length - 1] === input.rowIndex);

  const active = input.activeGroup;
  const hover = input.hoverGroup;
  const isActiveHeader = active != null && active.headerRowIndex === input.rowIndex;
  const isActiveChild =
    active != null && active.childRowIndexes.includes(input.rowIndex);
  const isHoverHeader = hover != null && hover.headerRowIndex === input.rowIndex;
  const isHoverChild = hover != null && hover.childRowIndexes.includes(input.rowIndex);

  return {
    kind,
    isProjectHeader,
    inActiveGroup: isActiveHeader || isActiveChild,
    isActiveHeader,
    isActiveChild,
    inHoverGroup: isHoverHeader || isHoverChild,
    isHoverHeader,
    isHoverChild,
    isUnassigned,
    accentIndex,
    isGroupFirst,
    isGroupLast,
  };
}

/** CSS module class keys applied for a spreadsheet row (for tests + rendering). */
export function projectHeaderSpreadsheetRowClassNames(
  highlight: ProjectHeaderSpreadsheetRowHighlight
): readonly string[] {
  const classes: string[] = [];
  if (highlight.kind === 'column_header') classes.push('projectHeaderColumnHeaderRow');
  if (highlight.isProjectHeader) classes.push('projectHeaderSectionHeaderRow');
  if (
    highlight.accentIndex != null &&
    !highlight.isProjectHeader &&
    highlight.kind !== 'column_header' &&
    !highlight.isUnassigned &&
    highlight.kind !== 'excluded'
  ) {
    classes.push('projectHeaderGroupChild');
  }
  if (highlight.inActiveGroup) classes.push('projectHeaderGroupActive');
  if (highlight.isGroupFirst) classes.push('projectHeaderGroupFirst');
  if (highlight.isGroupLast) classes.push('projectHeaderGroupLast');
  if (highlight.isUnassigned) classes.push('projectHeaderUnassignedDataRow');
  if (highlight.kind === 'excluded') classes.push('projectHeaderExcludedRow');
  if (highlight.accentIndex != null) {
    classes.push(`projectHeaderAccent${highlight.accentIndex}`);
  }
  return classes;
}

export function initialProjectHeaderRowSelection(
  matrix: readonly (readonly string[])[],
  columnHeaderRowIndex: number
): readonly number[] {
  return suggestProjectHeaderRowIndexes(matrix, columnHeaderRowIndex);
}

export function toggleProjectHeaderRowSelection(
  selected: readonly number[],
  rowIndex: number,
  selectedNext: boolean
): readonly number[] {
  const set = new Set(selected);
  if (selectedNext) set.add(rowIndex);
  else set.delete(rowIndex);
  return [...set].sort((a, b) => a - b);
}

export function canContinueProjectHeaderRows(input: {
  readonly matrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly nameOverrides?: Readonly<Record<number, string>>;
  readonly excludedRowIndexes?: ReadonlySet<number> | readonly number[];
}): boolean {
  return validateHeaderRowProjectSelection(input).ok;
}

/**
 * Map detected header-row groups into WorksheetProjectConfig so the existing
 * Create / Attach / Skip master-detail screen can resolve destinations.
 * Synthetic sheets always place the column header at row 0.
 */
export function headerRowGroupsToWorksheetConfigs(
  groups: readonly HeaderRowProjectGroup[],
  columnCount: number
): readonly WorksheetProjectConfig[] {
  return groups.map((group) => ({
    worksheetId: group.groupId,
    worksheetName: group.sourceDisplayName || group.displayName || group.groupId,
    included: true,
    projectName: group.displayName,
    headerRowIndex: 0,
    dataRowCount: group.childRowIndexes.length,
    columnCount,
  }));
}

/**
 * Synthetic sheet inputs for header-row groups — reuse worksheet project UI
 * without a second spreadsheet-preview system for resolution.
 */
export function headerRowGroupsToWorksheetSheets(
  matrix: readonly (readonly string[])[],
  groups: readonly HeaderRowProjectGroup[],
  columnHeaderRowIndex: number
): readonly WorksheetSheetInput[] {
  const headerRow = matrix[columnHeaderRowIndex] ?? [];
  return groups.map((group) => {
    const childMatrix = group.childRowIndexes.map((index) => [...(matrix[index] ?? [])]);
    return {
      worksheetId: group.groupId,
      worksheetName: group.displayName || group.sourceDisplayName || group.groupId,
      matrix: [[...headerRow], ...childMatrix],
    };
  });
}

export function seedHeaderRowResolutions(
  configs: readonly WorksheetProjectConfig[]
): Readonly<Record<string, WorksheetResolutionDraft>> {
  return buildDefaultWorksheetResolutions(configs);
}

export function mergeHeaderRowNameOverride(
  overrides: Readonly<Record<number, string>>,
  headerRowIndex: number,
  name: string
): Record<number, string> {
  return { ...overrides, [headerRowIndex]: name };
}

export { projectHeaderGroupId, buildHeaderRowProjectGroups };
