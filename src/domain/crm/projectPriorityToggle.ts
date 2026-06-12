import type { CrmPriority, CrmProjectSummary } from './project';
import { isCrmProjectComplete } from './projectCompletion';

/** True when the project is flagged priority (urgent). */
export function isProjectPriorityUrgent(priority: CrmPriority): boolean {
  return priority === 'urgent';
}

/** @deprecated alias — use isProjectPriorityUrgent */
export function isProjectPriorityActive(priority: CrmPriority): boolean {
  return isProjectPriorityUrgent(priority);
}

/** Toggle between normal (off) and urgent (on). */
export function toggleProjectPriority(priority: CrmPriority): CrmPriority {
  return isProjectPriorityUrgent(priority) ? 'normal' : 'urgent';
}

/** Filter UI + list matching — only normal vs urgent matter in practice. */
export type CrmPriorityFilterValue = 'normal' | 'urgent';

export const CRM_PRIORITY_FILTER_VALUES: readonly CrmPriorityFilterValue[] = [
  'normal',
  'urgent',
];

export function projectMatchesPriorityListFilter(
  priority: CrmPriority,
  selected: readonly CrmPriority[]
): boolean {
  if (selected.length === 0) return true;
  const urgent = isProjectPriorityUrgent(priority);
  if (selected.includes('urgent') && urgent) return true;
  if (selected.includes('normal') && !urgent) return true;
  return false;
}

/** Dashboard / pipeline list order: urgent, then normal, then complete. */
export function getCrmProjectListSortRank(project: CrmProjectSummary): number {
  if (isCrmProjectComplete(project)) return 2;
  if (isProjectPriorityUrgent(project.priority)) return 0;
  return 1;
}

export function compareCrmProjectsForListSort(
  a: CrmProjectSummary,
  b: CrmProjectSummary
): number {
  const rankDiff = getCrmProjectListSortRank(a) - getCrmProjectListSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt);
}

export function sortCrmProjectsForList(
  projects: readonly CrmProjectSummary[]
): CrmProjectSummary[] {
  return [...projects].sort(compareCrmProjectsForListSort);
}
