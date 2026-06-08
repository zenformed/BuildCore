export type ProjectDetailRouteParams = {
  readonly parentRouteSlug: string;
  readonly subSlug?: string;
};

export function resolveActiveProjectSlug(params: ProjectDetailRouteParams): string {
  return params.subSlug ?? params.parentRouteSlug;
}

export type ProjectDetailRoutes = {
  readonly detail: string;
  readonly workflowTasks: string;
  readonly documents: string;
  readonly accountability: string;
  readonly financials: string;
  readonly budget: string;
  readonly subproject: (childSlug: string) => string;
};

/** Build project detail paths, including nested subproject routes when subSlug is set. */
export function buildProjectDetailRoutes(params: ProjectDetailRouteParams): ProjectDetailRoutes {
  const { parentRouteSlug, subSlug } = params;
  const base =
    subSlug != null && subSlug.length > 0
      ? `/projects/${encodeURIComponent(parentRouteSlug)}/${encodeURIComponent(subSlug)}`
      : `/projects/${encodeURIComponent(parentRouteSlug)}`;

  return {
    detail: base,
    workflowTasks: `${base}/tasks`,
    documents: `${base}/documents`,
    accountability: `${base}/accountability`,
    financials: `${base}/financials`,
    budget: `${base}/budget`,
    subproject: (childSlug: string) =>
      `/projects/${encodeURIComponent(parentRouteSlug)}/${encodeURIComponent(childSlug)}`,
  };
}
