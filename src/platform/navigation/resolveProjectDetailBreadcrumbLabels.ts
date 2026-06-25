import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';

export type ResolveProjectDetailBreadcrumbLabelsInput = {
  readonly parentRouteSlug: string;
  readonly subSlug?: string;
  readonly parentProject: CrmProjectSummary | null;
  readonly detailReady: CrmProjectDetail | null;
  readonly staleProject: CrmProjectDetail | null;
  readonly isRefreshing: boolean;
};

/** Keep breadcrumb text aligned with the URL while project detail refetches. */
export function resolveProjectDetailBreadcrumbCurrentLabel({
  parentRouteSlug,
  subSlug,
  parentProject,
  detailReady,
  staleProject,
  isRefreshing,
}: ResolveProjectDetailBreadcrumbLabelsInput): string {
  if (!isRefreshing && detailReady != null) {
    return detailReady.summary.name;
  }

  const onSubRoute = subSlug != null && subSlug.length > 0;
  const staleSummary = staleProject?.summary;

  if (onSubRoute) {
    if (staleSummary?.slug === subSlug) {
      return staleSummary.name;
    }
    return subSlug;
  }

  if (staleSummary?.parentProjectId != null) {
    return parentProject?.name.trim() || parentRouteSlug;
  }

  if (staleSummary?.slug === parentRouteSlug) {
    return staleSummary.name;
  }

  return parentRouteSlug;
}
