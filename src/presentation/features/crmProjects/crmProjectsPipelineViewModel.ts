import type { CrmPriority, CrmProjectSummary, PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';
import { buildCrmProjectSummarySearchHaystack, projectHasAnyWorkflowTaskStatus } from '@/domain/crm';
import type { PipelineStage } from '@/domain/crm/pipelineStage';
import type { PipelineStageScope } from '@/domain/buildcore/orgPipelineStages';
import { resolveDerivedWorkflowStageSlugFromProgressIndex } from '@/domain/buildcore/projectPipelineProgress';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import {
  projectMatchesPriorityListFilter,
  sortCrmProjectsForList,
} from '@/domain/crm/projectPriorityToggle';

export type MixedPipelineStageFilterGroup = {
  readonly scope: PipelineStageScope;
  readonly title: string;
  readonly stages: readonly PipelineStage[];
};

export function buildMixedPipelineStageFilterGroups(input: {
  readonly projectStages: readonly PipelineStage[];
  readonly subprojectStages: readonly PipelineStage[];
  readonly projectTitle: string;
  readonly subprojectTitle: string;
}): readonly MixedPipelineStageFilterGroup[] {
  return [
    { scope: 'project', title: input.projectTitle, stages: input.projectStages },
    { scope: 'subproject', title: input.subprojectTitle, stages: input.subprojectStages },
  ];
}

/** Sentinel id for “Unassigned” in assignee list filters. */
export const CRM_LIST_FILTER_UNASSIGNED_ASSIGNEE_ID = '__unassigned__';

export type CrmDocumentsRequiredFilterValue = 'yes' | 'no';

export type CrmProjectsListFilters = {
  readonly stageSlugs: readonly PipelineStageSlug[];
  readonly priorities: readonly CrmPriority[];
  readonly workflowTaskStatuses: readonly WorkflowTaskStatus[];
  readonly assignedMemberIds: readonly string[];
  readonly documentsRequired: readonly CrmDocumentsRequiredFilterValue[];
};

export const EMPTY_CRM_PROJECTS_LIST_FILTERS: CrmProjectsListFilters = {
  stageSlugs: [],
  priorities: [],
  workflowTaskStatuses: [],
  assignedMemberIds: [],
  documentsRequired: [],
};

export type CrmProjectListFilterContext = {
  readonly workflowTaskStatusIndex: CrmProjectWorkflowTaskStatusIndex;
  readonly workflowTaskStatusIndexReady: boolean;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly workflowProgressInputIndexReady?: boolean;
  readonly resolveStagesForProject?: (
    project: Pick<CrmProjectSummary, 'parentProjectId'>
  ) => readonly PipelineStage[];
};

export const EMPTY_CRM_PROJECT_LIST_FILTER_CONTEXT: CrmProjectListFilterContext = {
  workflowTaskStatusIndex: new Map(),
  workflowTaskStatusIndexReady: true,
};

export function isCrmProjectsListFiltersActive(filters: CrmProjectsListFilters): boolean {
  return (
    filters.stageSlugs.length > 0 ||
    filters.priorities.length > 0 ||
    filters.workflowTaskStatuses.length > 0 ||
    filters.assignedMemberIds.length > 0 ||
    filters.documentsRequired.length > 0
  );
}

export function resolveCrmProjectsTableEmptyMessage(options: {
  readonly isMemberRole: boolean;
  readonly totalProjectCount: number;
  readonly memberNoAssignmentsMessage: string;
  readonly searchOrFiltersMessage: string;
}): string {
  if (options.isMemberRole && options.totalProjectCount === 0) {
    return options.memberNoAssignmentsMessage;
  }
  return options.searchOrFiltersMessage;
}

/** Matches list/table stage pills — derived from workflow progress when available. */
export function resolveProjectListFilterStageSlug(
  project: CrmProjectSummary,
  filterContext: CrmProjectListFilterContext
): PipelineStageSlug {
  const {
    workflowProgressInputIndex,
    workflowProgressInputIndexReady,
    resolveStagesForProject,
  } = filterContext;

  if (
    workflowProgressInputIndex != null &&
    workflowProgressInputIndexReady &&
    resolveStagesForProject != null
  ) {
    return resolveDerivedWorkflowStageSlugFromProgressIndex({
      summary: project,
      workflowProgressInputIndex,
      stages: resolveStagesForProject(project),
    });
  }

  return project.currentStageSlug;
}

function projectMatchesListFilters(
  project: CrmProjectSummary,
  searchQuery: string,
  filters: CrmProjectsListFilters,
  filterContext: CrmProjectListFilterContext
): boolean {
  const q = searchQuery.trim().toLowerCase();
  const { stageSlugs, priorities, workflowTaskStatuses } = filters;
  const { workflowTaskStatusIndex, workflowTaskStatusIndexReady } = filterContext;

  if (stageSlugs.length > 0) {
    const stageSlug = resolveProjectListFilterStageSlug(project, filterContext);
    if (!stageSlugs.includes(stageSlug)) {
      return false;
    }
  }
  if (priorities.length > 0 && !projectMatchesPriorityListFilter(project.priority, priorities)) {
    return false;
  }
  if (
    workflowTaskStatuses.length > 0 &&
    workflowTaskStatusIndexReady &&
    !projectHasAnyWorkflowTaskStatus(project.id, workflowTaskStatuses, workflowTaskStatusIndex)
  ) {
    return false;
  }
  if (!q) return true;
  return buildCrmProjectSummarySearchHaystack(project).includes(q);
}

function sortCrmProjectSummaries(projects: readonly CrmProjectSummary[]): CrmProjectSummary[] {
  return sortCrmProjectsForList(projects);
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
  filters: CrmProjectsListFilters,
  filterContext: CrmProjectListFilterContext = EMPTY_CRM_PROJECT_LIST_FILTER_CONTEXT
): CrmProjectSummary[] {
  return sortCrmProjectSummaries(
    projects.filter((project) =>
      projectMatchesListFilters(project, searchQuery, filters, filterContext)
    )
  );
}

export function filterDashboardProjectSummaries(
  summaries: readonly CrmProjectSummary[],
  searchQuery: string,
  filters: CrmProjectsListFilters,
  filterContext: CrmProjectListFilterContext = EMPTY_CRM_PROJECT_LIST_FILTER_CONTEXT
): {
  rootRows: CrmProjectSummary[];
  allChildrenByParentId: Map<string, CrmProjectSummary[]>;
  visibleChildrenByParentId: Map<string, CrmProjectSummary[]>;
  parentsWithMatchingChildren: Set<string>;
} {
  const { roots, childrenByParentId } = partitionCrmProjectSummaries(summaries);
  const visibleChildrenByParentId = new Map<string, CrmProjectSummary[]>();
  const parentsWithMatchingChildren = new Set<string>();
  // Drop orphans whose parent was archived/deleted (not in the active root set).
  const activeRootIds = new Set(roots.map((root) => root.id));

  for (const [parentId, children] of childrenByParentId) {
    if (!activeRootIds.has(parentId)) {
      continue;
    }
    const matchingChildren = children.filter((child) =>
      projectMatchesListFilters(child, searchQuery, filters, filterContext)
    );
    if (matchingChildren.length > 0) {
      visibleChildrenByParentId.set(parentId, sortCrmProjectSummaries(matchingChildren));
      parentsWithMatchingChildren.add(parentId);
    }
  }

  const rootRows = roots.filter(
    (root) =>
      projectMatchesListFilters(root, searchQuery, filters, filterContext) ||
      parentsWithMatchingChildren.has(root.id)
  );

  return {
    rootRows: sortCrmProjectSummaries(rootRows),
    allChildrenByParentId: childrenByParentId,
    visibleChildrenByParentId,
    parentsWithMatchingChildren,
  };
}

export type CrmProjectsDashboardView = ReturnType<typeof filterDashboardProjectSummaries>;

export const EMPTY_CRM_PROJECTS_DASHBOARD_VIEW: CrmProjectsDashboardView = {
  rootRows: [],
  allChildrenByParentId: new Map(),
  visibleChildrenByParentId: new Map(),
  parentsWithMatchingChildren: new Set(),
};

export function collectDashboardRadiusFilterCandidates(
  view: CrmProjectsDashboardView
): CrmProjectSummary[] {
  const projects: CrmProjectSummary[] = [];
  const seen = new Set<string>();

  const add = (project: CrmProjectSummary): void => {
    if (seen.has(project.id)) {
      return;
    }
    seen.add(project.id);
    projects.push(project);
  };

  for (const root of view.rootRows) {
    add(root);
  }
  for (const children of view.visibleChildrenByParentId.values()) {
    for (const child of children) {
      add(child);
    }
  }

  return projects;
}

export function buildDashboardParentSummariesById(
  summaries: readonly CrmProjectSummary[]
): Map<string, CrmProjectSummary> {
  const parentById = new Map<string, CrmProjectSummary>();
  for (const project of summaries) {
    if (project.parentProjectId == null) {
      parentById.set(project.id, project);
    }
  }
  return parentById;
}

export function collectDashboardSubprojectRows(
  view: CrmProjectsDashboardView
): CrmProjectSummary[] {
  const rows: CrmProjectSummary[] = [];
  for (const children of view.visibleChildrenByParentId.values()) {
    rows.push(...children);
  }
  return sortCrmProjectSummaries(rows);
}

export function applyRadiusFilterToDashboardView(
  view: CrmProjectsDashboardView,
  matchingProjectIds: ReadonlySet<string>
): CrmProjectsDashboardView {
  const visibleChildrenByParentId = new Map<string, CrmProjectSummary[]>();
  const parentsWithMatchingChildren = new Set<string>();

  for (const [parentId, children] of view.visibleChildrenByParentId) {
    const matchingChildren = children.filter((child) => matchingProjectIds.has(child.id));
    if (matchingChildren.length > 0) {
      visibleChildrenByParentId.set(parentId, sortCrmProjectSummaries(matchingChildren));
      parentsWithMatchingChildren.add(parentId);
    }
  }

  const rootRows = view.rootRows.filter(
    (root) => matchingProjectIds.has(root.id) || parentsWithMatchingChildren.has(root.id)
  );

  return {
    rootRows: sortCrmProjectSummaries(rootRows),
    allChildrenByParentId: view.allChildrenByParentId,
    visibleChildrenByParentId,
    parentsWithMatchingChildren,
  };
}
