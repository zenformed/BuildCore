const PROJECT_SUBPAGE_SEGMENTS = new Set([
  'tasks',
  'documents',
  'accountability',
  'financials',
  'budget',
]);

export type ParsedProjectDetailPathname = {
  readonly parentRouteSlug: string;
  readonly subSlug?: string;
};

function normalizePathname(pathname: string): string {
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

/** Derive parent/subproject slugs from the URL (more reliable than layout useParams). */
export function parseProjectDetailPathname(pathname: string): ParsedProjectDetailPathname {
  const segments = normalizePathname(pathname).split('/').filter(Boolean);
  if (segments[0] !== 'projects') {
    return { parentRouteSlug: '' };
  }

  const parentRouteSlug = decodeURIComponent(segments[1] ?? '');
  if (!parentRouteSlug) {
    return { parentRouteSlug: '' };
  }

  const thirdSegment = segments[2];
  if (!thirdSegment || PROJECT_SUBPAGE_SEGMENTS.has(thirdSegment)) {
    return { parentRouteSlug, subSlug: undefined };
  }

  return { parentRouteSlug, subSlug: decodeURIComponent(thirdSegment) };
}
