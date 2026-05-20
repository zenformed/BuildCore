import type { ProjectDetailPageContext } from './projectDetailPageContext';

/** Map the current project route pathname to shell breadcrumb/header context. */
export function resolveProjectDetailPageContext(
  pathname: string,
  slug: string
): ProjectDetailPageContext {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return 'detail';

  const base = `/projects/${trimmedSlug}`;
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (normalized === base) return 'detail';
  if (normalized === `${base}/tasks`) return 'workflowTasks';
  if (normalized === `${base}/financials` || normalized === `${base}/budget`) return 'financials';
  if (normalized === `${base}/documents`) return 'documents';
  if (normalized === `${base}/accountability`) return 'accountability';

  return 'detail';
}
