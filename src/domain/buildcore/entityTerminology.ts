/**
 * Organization display terminology for Project / Subproject entity words.
 * Display-only — does not rename DB columns, API properties, routes, or domain types.
 *
 * Deferred follow-ups (not covered by this feature yet):
 * - ZenformedCore email templates
 * - Historical accountability log entries
 * - PDF report labels
 * - Organization XLSX export headers
 * - Public lead capture pages
 * - Customer task portal
 */

export const BUILDCORE_ENTITY_TERMINOLOGY_MAX_LENGTH = 40;

export const BUILDCORE_ENTITY_TERMINOLOGY_KEYS = ['project', 'subproject'] as const;

export type BuildCoreEntityTerminologyKey = (typeof BUILDCORE_ENTITY_TERMINOLOGY_KEYS)[number];

export const DEFAULT_ENTITY_TERMINOLOGY: Readonly<
  Record<BuildCoreEntityTerminologyKey, string>
> = {
  project: 'Project',
  subproject: 'Subproject',
};

export type ResolvedEntityTerminology = {
  readonly project: string;
  readonly subproject: string;
  readonly projects: string;
  readonly subprojects: string;
};

export type EntityTerminologyValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function isBuildCoreEntityTerminologyKey(
  value: string
): value is BuildCoreEntityTerminologyKey {
  return (BUILDCORE_ENTITY_TERMINOLOGY_KEYS as readonly string[]).includes(value);
}

/** Force the first character uppercase; leave the rest of the user input unchanged. */
export function capitalizeEntityTerminologyDisplayName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('en-US') + trimmed.slice(1);
}

/** Simple display plural: add "s" unless the term already ends with "s". */
export function pluralizeDisplayTerm(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return trimmed;
  if (/s$/i.test(trimmed)) return trimmed;
  return `${trimmed}s`;
}

export function validateEntityTerminologyDisplayName(
  value: string
): EntityTerminologyValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: 'Name is required.' };
  }
  const capitalized = capitalizeEntityTerminologyDisplayName(trimmed);
  if (capitalized.length > BUILDCORE_ENTITY_TERMINOLOGY_MAX_LENGTH) {
    return {
      ok: false,
      message: `Name must be ${BUILDCORE_ENTITY_TERMINOLOGY_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: capitalized };
}

export function resolveEntityTerminology(
  overrides: Readonly<Partial<Record<BuildCoreEntityTerminologyKey, string>>> = {}
): ResolvedEntityTerminology {
  const project = capitalizeEntityTerminologyDisplayName(
    overrides.project?.trim() || DEFAULT_ENTITY_TERMINOLOGY.project
  );
  const subproject = capitalizeEntityTerminologyDisplayName(
    overrides.subproject?.trim() || DEFAULT_ENTITY_TERMINOLOGY.subproject
  );
  return {
    project,
    subproject,
    projects: pluralizeDisplayTerm(project),
    subprojects: pluralizeDisplayTerm(subproject),
  };
}

export function buildDefaultEntityTerminologyOverrides(): Record<
  BuildCoreEntityTerminologyKey,
  string
> {
  return { ...DEFAULT_ENTITY_TERMINOLOGY };
}
