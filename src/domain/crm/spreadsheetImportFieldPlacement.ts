/**
 * Suggest whether a remaining column should live on the project or each subproject
 * based on within-group value consistency (deterministic; no AI).
 */

import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export type CrmImportSuggestedFieldPlacement = 'project' | 'subproject';

export type CrmImportPlacementGroup = {
  /** Source row indexes belonging to one detected project group. */
  readonly sourceRowIndexes: readonly number[];
};

/**
 * If every non-blank value within each group matches (normalized), suggest project.
 * If any group has differing values, suggest subproject.
 * Empty/all-blank columns default to subproject.
 */
export function suggestFieldPlacementFromGroupConsistency(input: {
  readonly groups: readonly CrmImportPlacementGroup[];
  readonly rowsBySourceIndex: ReadonlyMap<number, Readonly<Record<number, string>>>;
  readonly columnIndex: number;
}): CrmImportSuggestedFieldPlacement {
  let sawAnyValue = false;

  for (const group of input.groups) {
    const distinct = new Set<string>();
    for (const sourceRowIndex of group.sourceRowIndexes) {
      const cells = input.rowsBySourceIndex.get(sourceRowIndex);
      const raw = cells?.[input.columnIndex] ?? '';
      const trimmed = String(raw).trim();
      if (!trimmed) continue;
      sawAnyValue = true;
      distinct.add(normalizeImportText(trimmed));
      if (distinct.size > 1) return 'subproject';
    }
  }

  if (!sawAnyValue) return 'subproject';
  return 'project';
}
