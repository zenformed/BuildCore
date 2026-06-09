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
