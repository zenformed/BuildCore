import type { CrmPriority, CrmProjectSummary, PipelineStageSlug } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';

export type CrmStageFilter = PipelineStageSlug | 'all';
export type CrmPriorityFilter = CrmPriority | 'all';

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
  stageFilter: CrmStageFilter,
  priorityFilter: CrmPriorityFilter
): CrmProjectSummary[] {
  const q = searchQuery.trim().toLowerCase();

  return projects
    .filter((project) => {
      if (stageFilter !== 'all' && project.currentStageSlug !== stageFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && project.priority !== priorityFilter) {
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
