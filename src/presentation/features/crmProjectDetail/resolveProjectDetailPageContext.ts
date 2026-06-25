import type { ProjectDetailPageContext } from './projectDetailPageContext';

function normalizePathname(pathname: string): string {
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

function stripDemoPrefix(pathname: string): string {
  const normalized = normalizePathname(pathname);
  return normalized.startsWith('/demo/') ? normalized.slice('/demo'.length) : normalized;
}

function resolveSubPageContext(normalized: string, base: string): ProjectDetailPageContext {
  if (normalized === `${base}/tasks`) return 'workflowTasks';
  if (normalized === `${base}/financials` || normalized === `${base}/budget`) return 'financials';
  if (normalized === `${base}/documents`) return 'documents';
  if (normalized === `${base}/accountability`) return 'accountability';
  return 'detail';
}

/** Map the current project route pathname to shell breadcrumb/header context. */
export function resolveProjectDetailPageContext(
  pathname: string,
  parentRouteSlug: string,
  subSlug?: string
): ProjectDetailPageContext {
  const trimmedParent = parentRouteSlug.trim();
  if (!trimmedParent) return 'detail';

  const normalized = stripDemoPrefix(pathname);
  const parentBase = `/projects/${trimmedParent}`;

  if (subSlug?.trim()) {
    const childBase = `${parentBase}/${subSlug.trim()}`;
    if (normalized === childBase || normalized.startsWith(`${childBase}/`)) {
      return resolveSubPageContext(normalized, childBase);
    }
  }

  if (normalized === parentBase || normalized.startsWith(`${parentBase}/`)) {
    return resolveSubPageContext(normalized, parentBase);
  }

  return 'detail';
}
