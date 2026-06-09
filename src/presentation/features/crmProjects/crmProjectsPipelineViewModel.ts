import type { CrmPriority, CrmProjectSummary, PipelineStageSlug } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';

export type CrmProjectsListFilters = {
  readonly stageSlugs: readonly PipelineStageSlug[];
  readonly priorities: readonly CrmPriority[];
};

export const EMPTY_CRM_PROJECTS_LIST_FILTERS: CrmProjectsListFilters = {
  stageSlugs: [],
  priorities: [],
};

export function isCrmProjectsListFiltersActive(filters: CrmProjectsListFilters): boolean {
  return filters.stageSlugs.length > 0 || filters.priorities.length > 0;
}

function projectSearchHaystack(project: CrmProjectSummary): string {
  return [
    project.name,
    project.client.name,
    project.contact.name,
    project.contact.email,
    project.contact.phone,
    project.notesPreview,
    project.assignedTo?.displayName,
  ]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
}

export function filterCrmProjectSummaries(
  projects: readonly CrmProjectSummary[],
  searchQuery: string,
  filters: CrmProjectsListFilters
): CrmProjectSummary[] {
  const q = searchQuery.trim().toLowerCase();
  const { stageSlugs, priorities } = filters;

  return projects
    .filter((project) => {
      if (stageSlugs.length > 0 && !stageSlugs.includes(project.currentStageSlug)) {
        return false;
      }
      if (priorities.length > 0 && !priorities.includes(project.priority)) {
        return false;
      }
      if (!q) return true;
      return projectSearchHaystack(project).includes(q);
    })
    .sort((a, b) => {
      const aComplete = isCrmProjectComplete(a) ? 1 : 0;
      const bComplete = isCrmProjectComplete(b) ? 1 : 0;
      if (aComplete !== bComplete) return aComplete - bComplete;
      return Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt);
    });
}
