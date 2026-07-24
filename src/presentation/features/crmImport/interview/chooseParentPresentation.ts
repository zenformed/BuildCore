/**
 * Pure helpers for the one-Project destination picker presentation.
 */

import type { CrmProjectSummary } from '@/domain/crm/project';
import {
  CRM_IMPORT_PARENT_LIST_PAGE_SIZE,
  searchImportParentCandidates,
  toCrmImportParentCandidate,
  type CrmImportParentCandidate,
} from '@/domain/crm/spreadsheetImportParentSearch';

export type ChooseParentEmptyKind = 'none' | 'no_eligible' | 'no_search_results';

export function filterChooseParentCandidates(
  candidates: readonly CrmImportParentCandidate[],
  query: string
): readonly CrmImportParentCandidate[] {
  // Unbounded filtered set for the picker; UI pages via visibleLimit.
  return searchImportParentCandidates(candidates, query, { limit: Number.MAX_SAFE_INTEGER });
}

export function pageChooseParentCandidates(
  filtered: readonly CrmImportParentCandidate[],
  visibleLimit: number
): {
  readonly visible: readonly CrmImportParentCandidate[];
  readonly remainingCount: number;
} {
  const limit = Math.max(0, visibleLimit);
  const visible = filtered.slice(0, limit);
  return {
    visible,
    remainingCount: Math.max(0, filtered.length - visible.length),
  };
}

export function nextChooseParentVisibleLimit(current: number): number {
  return current + CRM_IMPORT_PARENT_LIST_PAGE_SIZE;
}

export function resolveChooseParentEmptyKind(input: {
  readonly totalEligible: number;
  readonly filteredCount: number;
  readonly query: string;
}): ChooseParentEmptyKind {
  if (input.totalEligible === 0) return 'no_eligible';
  if (input.filteredCount === 0 && input.query.trim() !== '') return 'no_search_results';
  return 'none';
}

export function chooseParentRowClassName(input: {
  readonly selected: boolean;
  readonly styles: {
    readonly row: string;
    readonly selected: string;
  };
}): string {
  return [input.styles.row, input.selected ? input.styles.selected : ''].filter(Boolean).join(' ');
}

/**
 * After nested Create Project succeeds, prefer the refreshed eligible list entry
 * so Subproject counts and search haystacks stay consistent with the picker.
 */
export function resolveCreatedChooseParentCandidate(
  refreshed: readonly CrmImportParentCandidate[],
  created: { readonly id: string; readonly summary: CrmProjectSummary }
): CrmImportParentCandidate {
  return (
    refreshed.find((candidate) => candidate.id === created.id) ??
    toCrmImportParentCandidate(created.summary, 0)
  );
}

export function isChooseParentSelectionReady(selectedId: string | null): boolean {
  return selectedId != null && selectedId.trim() !== '';
}

/** Mirrors CSS breakpoints for the destination picker layout. */
export type ChooseParentLayoutMode = 'desktop' | 'tablet' | 'mobile';

export function resolveChooseParentLayoutMode(viewportWidth: number): ChooseParentLayoutMode {
  if (viewportWidth <= 720) return 'mobile';
  if (viewportWidth <= 980) return 'tablet';
  return 'desktop';
}

export function chooseParentVisibleColumns(
  mode: ChooseParentLayoutMode
): readonly ('project' | 'customer' | 'location' | 'subprojects' | 'updated' | 'selection')[] {
  if (mode === 'mobile') {
    return ['project', 'customer', 'location', 'subprojects', 'selection'];
  }
  if (mode === 'tablet') {
    return ['project', 'customer', 'location', 'selection'];
  }
  return ['project', 'customer', 'location', 'subprojects', 'updated', 'selection'];
}
