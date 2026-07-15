import type { ResolvedEntityTerminology } from '@/domain/buildcore/entityTerminology';

/**
 * Opaque placeholders for content/nav catalogs.
 * Must not contain the substrings "project" / "subproject" (avoids re-tokenization).
 */
export const ENTITY_TERM_TOKEN = {
  project: '§E1§',
  projects: '§E2§',
  subproject: '§E3§',
  subprojects: '§E4§',
  projectLc: '§E5§',
  projectsLc: '§E6§',
  subprojectLc: '§E7§',
  subprojectsLc: '§E8§',
} as const;

export function buildEntityTerminologyTokenMap(
  terms: ResolvedEntityTerminology
): Readonly<Record<string, string>> {
  return {
    [ENTITY_TERM_TOKEN.subprojectsLc]: terms.subprojects.toLocaleLowerCase('en-US'),
    [ENTITY_TERM_TOKEN.subprojectLc]: terms.subproject.toLocaleLowerCase('en-US'),
    [ENTITY_TERM_TOKEN.projectsLc]: terms.projects.toLocaleLowerCase('en-US'),
    [ENTITY_TERM_TOKEN.projectLc]: terms.project.toLocaleLowerCase('en-US'),
    [ENTITY_TERM_TOKEN.subprojects]: terms.subprojects,
    [ENTITY_TERM_TOKEN.subproject]: terms.subproject,
    [ENTITY_TERM_TOKEN.projects]: terms.projects,
    [ENTITY_TERM_TOKEN.project]: terms.project,
  };
}

const TOKEN_ORDER = [
  ENTITY_TERM_TOKEN.subprojectsLc,
  ENTITY_TERM_TOKEN.subprojectLc,
  ENTITY_TERM_TOKEN.projectsLc,
  ENTITY_TERM_TOKEN.projectLc,
  ENTITY_TERM_TOKEN.subprojects,
  ENTITY_TERM_TOKEN.subproject,
  ENTITY_TERM_TOKEN.projects,
  ENTITY_TERM_TOKEN.project,
] as const;

export function resolveEntityTerminologyTokens(
  value: string,
  terms: ResolvedEntityTerminology
): string {
  const map = buildEntityTerminologyTokenMap(terms);
  let next = value;
  for (const token of TOKEN_ORDER) {
    next = next.split(token).join(map[token]);
  }
  return next;
}

export function deepResolveEntityTerminologyTokens<T>(
  value: T,
  terms: ResolvedEntityTerminology
): T {
  if (typeof value === 'string') {
    return resolveEntityTerminologyTokens(value, terms) as T;
  }
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => {
      const result = fn(...args);
      return deepResolveEntityTerminologyTokens(result, terms);
    }) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepResolveEntityTerminologyTokens(item, terms)) as T;
  }
  if (value != null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = deepResolveEntityTerminologyTokens(child, terms);
    }
    return out as T;
  }
  return value;
}
