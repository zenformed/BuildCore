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

function sortCrmProjectSummaries(projects: readonly CrmProjectSummary[]): CrmProjectSummary[] {
  return [...projects].sort((a, b) => {
    const aComplete = isCrmProjectComplete(a) ? 1 : 0;
    const bComplete = isCrmProjectComplete(b) ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;
    return Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt);
  });
}

function projectMatchesListFilters(
  project: CrmProjectSummary,
  searchQuery: string,
  filters: CrmProjectsListFilters
): boolean {
  const q = searchQuery.trim().toLowerCase();
  const { stageSlugs, priorities } = filters;

  if (stageSlugs.length > 0 && !stageSlugs.includes(project.currentStageSlug)) {
    return false;
  }
  if (priorities.length > 0 && !priorities.includes(project.priority)) {
    return false;
  }
  if (!q) return true;
  return projectSearchHaystack(project).includes(q);
}

export function partitionCrmProjectSummaries(summaries: readonly CrmProjectSummary[]): {
  roots: CrmProjectSummary[];
  childrenByParentId: Map<string, CrmProjectSummary[]>;
} {
  const roots: CrmProjectSummary[] = [];
  const childrenByParentId = new Map<string, CrmProjectSummary[]>();

  for (const project of summaries) {
    if (project.parentProjectId == null) {
      roots.push(project);
      continue;
    }
    const siblings = childrenByParentId.get(project.parentProjectId) ?? [];
    siblings.push(project);
    childrenByParentId.set(project.parentProjectId, siblings);
  }

  for (const [parentId, children] of childrenByParentId) {
    childrenByParentId.set(parentId, sortCrmProjectSummaries(children));
  }

  return {
    roots: sortCrmProjectSummaries(roots),
    childrenByParentId,
  };
}

/** Flat filter for tables that list projects without hierarchy (e.g. subprojects panel). */
export function filterCrmProjectSummaries(
  projects: readonly CrmProjectSummary[],
  searchQuery: string,
  filters: CrmProjectsListFilters
): CrmProjectSummary[] {
  return sortCrmProjectSummaries(
    projects.filter((project) => projectMatchesListFilters(project, searchQuery, filters))
  );
}

export function filterDashboardProjectSummaries(
  summaries: readonly CrmProjectSummary[],
  searchQuery: string,
  filters: CrmProjectsListFilters
): {
  rootRows: CrmProjectSummary[];
  allChildrenByParentId: Map<string, CrmProjectSummary[]>;
  visibleChildrenByParentId: Map<string, CrmProjectSummary[]>;
  parentsWithMatchingChildren: Set<string>;
} {
  const { roots, childrenByParentId } = partitionCrmProjectSummaries(summaries);
  const visibleChildrenByParentId = new Map<string, CrmProjectSummary[]>();
  const parentsWithMatchingChildren = new Set<string>();

  for (const [parentId, children] of childrenByParentId) {
    const matchingChildren = children.filter((child) =>
      projectMatchesListFilters(child, searchQuery, filters)
    );
    if (matchingChildren.length > 0) {
      visibleChildrenByParentId.set(parentId, sortCrmProjectSummaries(matchingChildren));
      parentsWithMatchingChildren.add(parentId);
    }
  }

  const rootRows = roots.filter(
    (root) =>
      projectMatchesListFilters(root, searchQuery, filters) ||
      parentsWithMatchingChildren.has(root.id)
  );

  return {
    rootRows: sortCrmProjectSummaries(rootRows),
    allChildrenByParentId: childrenByParentId,
    visibleChildrenByParentId,
    parentsWithMatchingChildren,
  };
}
