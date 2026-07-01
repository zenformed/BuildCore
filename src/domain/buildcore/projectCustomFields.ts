/**
 * Project custom fields — org-defined schema + per-project values.
 * Definitions are scoped to parent projects vs subprojects within an organization.
 */

import {
  resolveProjectTemplateScopeForProject,
  type BuildCoreProjectTemplateScope,
} from '@/domain/crm/projectTemplateScope';

export const BUILDCORE_PROJECT_CUSTOM_FIELD_LABEL_MAX_LENGTH = 80;

export const PROJECT_CUSTOM_FIELD_TYPES = ['text'] as const;

export type ProjectCustomFieldType = (typeof PROJECT_CUSTOM_FIELD_TYPES)[number];

export type ProjectCustomFieldSource = 'user' | 'import';

export const PROJECT_CUSTOM_FIELD_SCOPES = ['project', 'subproject'] as const;

export type ProjectCustomFieldScope = BuildCoreProjectTemplateScope;

export type ProjectCustomFieldDefinition = {
  readonly id: string;
  readonly fieldKey: string;
  readonly label: string;
  readonly fieldType: ProjectCustomFieldType;
  readonly scope: ProjectCustomFieldScope;
  readonly displayOrder: number;
  readonly isArchived: boolean;
  readonly source: ProjectCustomFieldSource;
};

/** fieldKey → trimmed text value or null when empty. */
export type ProjectCustomFieldsMap = Readonly<Record<string, string | null>>;

export type ProjectCustomFieldValuesInput = ProjectCustomFieldsMap;

export type ProjectCustomFieldValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function isProjectCustomFieldScope(value: string): value is ProjectCustomFieldScope {
  return (PROJECT_CUSTOM_FIELD_SCOPES as readonly string[]).includes(value);
}

/** Resolve custom field scope from a CRM project row/summary. */
export function resolveProjectCustomFieldScopeForProject(input: {
  readonly parentProjectId: string | null;
}): ProjectCustomFieldScope {
  return resolveProjectTemplateScopeForProject(input);
}

export function slugifyProjectCustomFieldKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return slug.length > 0 ? slug : 'field';
}

export function validateProjectCustomFieldLabel(
  label: string
): ProjectCustomFieldValidationResult {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, message: 'Label is required.' };
  }
  if (trimmed.length > BUILDCORE_PROJECT_CUSTOM_FIELD_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Label must be ${BUILDCORE_PROJECT_CUSTOM_FIELD_LABEL_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function isProjectCustomFieldType(value: string): value is ProjectCustomFieldType {
  return (PROJECT_CUSTOM_FIELD_TYPES as readonly string[]).includes(value);
}

export function normalizeProjectCustomFieldTextValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseProjectCustomFieldValuesInput(
  value: unknown
): ProjectCustomFieldValuesInput | null {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Record<string, string | null> = {};
  for (const [fieldKey, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof fieldKey !== 'string' || fieldKey.trim().length === 0) return null;
    if (raw !== null && typeof raw !== 'string') return null;
    result[fieldKey.trim()] = normalizeProjectCustomFieldTextValue(raw);
  }
  return result;
}

export function sortProjectCustomFieldDefinitions(
  definitions: readonly ProjectCustomFieldDefinition[]
): ProjectCustomFieldDefinition[] {
  return [...definitions].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.label.localeCompare(b.label);
  });
}

export function listActiveProjectCustomFieldDefinitions(
  definitions: readonly ProjectCustomFieldDefinition[]
): ProjectCustomFieldDefinition[] {
  return sortProjectCustomFieldDefinitions(definitions.filter((def) => !def.isArchived));
}

export function listActiveProjectCustomFieldDefinitionsForScope(
  definitions: readonly ProjectCustomFieldDefinition[],
  scope: ProjectCustomFieldScope
): ProjectCustomFieldDefinition[] {
  return listActiveProjectCustomFieldDefinitions(
    definitions.filter((def) => def.scope === scope)
  );
}
