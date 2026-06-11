import type { CrmProjectSummary } from '@/domain/crm';

const T2_DEBUG_SLUG = 't2';

function summarizeForListDebug(project: CrmProjectSummary): {
  id: string;
  slug: string;
  parentProjectId: string | null;
  name: string;
} {
  return {
    id: project.id,
    slug: project.slug,
    parentProjectId: project.parentProjectId,
    name: project.name,
  };
}

function findT2Summary(
  summaries: readonly CrmProjectSummary[]
): CrmProjectSummary | undefined {
  return summaries.find((project) => project.slug === T2_DEBUG_SLUG);
}

export function logCrmProjectListT2Debug(options: {
  route: 'subprojects' | 'dashboard-projects';
  parentSlug?: string;
  parentFound?: CrmProjectSummary | null;
  allSummaries: readonly CrmProjectSummary[];
  childSummariesBeforeScope?: readonly CrmProjectSummary[];
  childSummariesAfterScope?: readonly CrmProjectSummary[];
  /** Second list call using dashboard includeSubprojects=1 options, same request. */
  dashboardEquivalentSummaries?: readonly CrmProjectSummary[];
}): void {
  const {
    route,
    parentSlug,
    parentFound,
    allSummaries,
    childSummariesBeforeScope,
    childSummariesAfterScope,
    dashboardEquivalentSummaries,
  } = options;

  const t2InAllSummaries = findT2Summary(allSummaries);
  const t2InDashboardEquivalent = dashboardEquivalentSummaries
    ? findT2Summary(dashboardEquivalentSummaries)
    : undefined;

  console.info(`[${route}] list debug`, {
    parentSlug: parentSlug ?? null,
    parentFound: parentFound ? summarizeForListDebug(parentFound) : null,
    allSummariesLength: allSummaries.length,
    allSummarySlugs: allSummaries.map((project) => project.slug),
    t2ExistsInAllSummaries: t2InAllSummaries != null,
    t2InAllSummaries: t2InAllSummaries ? summarizeForListDebug(t2InAllSummaries) : null,
    t2ExistsWithDifferentParentId:
      t2InAllSummaries != null &&
      parentFound != null &&
      t2InAllSummaries.parentProjectId !== parentFound.id,
    t2ExpectedParentId: parentFound?.id ?? null,
    childSummariesBeforeScope: (childSummariesBeforeScope ?? []).map(summarizeForListDebug),
    childSummariesAfterScope: (childSummariesAfterScope ?? []).map(summarizeForListDebug),
    dashboardEquivalentLength: dashboardEquivalentSummaries?.length ?? null,
    dashboardEquivalentSlugs: dashboardEquivalentSummaries?.map((project) => project.slug) ?? null,
    t2ExistsInDashboardEquivalent: t2InDashboardEquivalent != null,
    t2InDashboardEquivalent: t2InDashboardEquivalent
      ? summarizeForListDebug(t2InDashboardEquivalent)
      : null,
  });
}
