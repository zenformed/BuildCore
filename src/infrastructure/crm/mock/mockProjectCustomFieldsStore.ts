import type {
  ProjectCustomFieldDefinition,
  ProjectCustomFieldScope,
} from '@/domain/buildcore/projectCustomFields';
import type { BuildCoreProjectCustomFieldsResponse } from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import {
  listActiveProjectCustomFieldDefinitionsForScope,
  resolveProjectCustomFieldScopeForProject,
  slugifyProjectCustomFieldKey,
  sortProjectCustomFieldDefinitions,
  validateProjectCustomFieldLabel,
} from '@/domain/buildcore/projectCustomFields';

type MockCustomFieldValueStore = Map<string, Map<string, string | null>>;

const definitions: ProjectCustomFieldDefinition[] = [];
const valuesByProjectId: MockCustomFieldValueStore = new Map();
let nextDefinitionId = 1;

function resolveUniqueFieldKey(scope: ProjectCustomFieldScope, baseKey: string): string {
  const existing = new Set(
    definitions.filter((def) => def.scope === scope).map((def) => def.fieldKey)
  );
  if (!existing.has(baseKey)) return baseKey;
  let suffix = 2;
  while (existing.has(`${baseKey}_${suffix}`)) suffix += 1;
  return `${baseKey}_${suffix}`;
}

export function getMockProjectCustomFieldsResponse(
  canManage = true
): BuildCoreProjectCustomFieldsResponse {
  return {
    definitions: sortProjectCustomFieldDefinitions(definitions),
    canManage,
  };
}

export function createMockProjectCustomFieldDefinition(
  label: string,
  scope: ProjectCustomFieldScope
): ProjectCustomFieldDefinition {
  const validated = validateProjectCustomFieldLabel(label);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  const fieldKey = resolveUniqueFieldKey(scope, slugifyProjectCustomFieldKey(validated.value));
  const scopedDefinitions = definitions.filter((def) => def.scope === scope);
  const definition: ProjectCustomFieldDefinition = {
    id: `mock-project-custom-field-${nextDefinitionId++}`,
    fieldKey,
    label: validated.value,
    fieldType: 'text',
    scope,
    displayOrder: scopedDefinitions.length + 1,
    isArchived: false,
    source: 'user',
  };
  definitions.push(definition);
  return definition;
}

export function updateMockProjectCustomFieldDefinition(
  scope: ProjectCustomFieldScope,
  fieldKey: string,
  patch: { label?: string; isArchived?: boolean }
): ProjectCustomFieldDefinition {
  const index = definitions.findIndex((def) => def.scope === scope && def.fieldKey === fieldKey);
  if (index < 0) throw new Error('Custom field not found.');
  const current = definitions[index]!;
  if (patch.label !== undefined) {
    const validated = validateProjectCustomFieldLabel(patch.label);
    if (!validated.ok) throw new Error(validated.message);
    definitions[index] = { ...current, label: validated.value };
  }
  if (patch.isArchived !== undefined) {
    definitions[index] = { ...definitions[index]!, isArchived: patch.isArchived };
  }
  return definitions[index]!;
}

export function getMockActiveProjectCustomFieldDefinitions(
  scope?: ProjectCustomFieldScope
): ProjectCustomFieldDefinition[] {
  if (scope == null) {
    return sortProjectCustomFieldDefinitions(definitions.filter((def) => !def.isArchived));
  }
  return listActiveProjectCustomFieldDefinitionsForScope(definitions, scope);
}

export function getMockProjectCustomFieldsForProject(
  projectId: string,
  parentProjectId: string | null
): Record<string, string | null> {
  const scope = resolveProjectCustomFieldScopeForProject({ parentProjectId });
  const projectValues = valuesByProjectId.get(projectId);
  if (!projectValues) return {};
  const activeKeys = new Set(
    getMockActiveProjectCustomFieldDefinitions(scope).map((def) => def.fieldKey)
  );
  const result: Record<string, string | null> = {};
  for (const [fieldKey, value] of projectValues.entries()) {
    if (activeKeys.has(fieldKey)) result[fieldKey] = value;
  }
  return result;
}

export function upsertMockProjectCustomFieldValues(
  projectId: string,
  parentProjectId: string | null,
  input: Readonly<Record<string, string | null>>
): Record<string, string | null> {
  const scope = resolveProjectCustomFieldScopeForProject({ parentProjectId });
  const activeKeys = new Set(
    getMockActiveProjectCustomFieldDefinitions(scope).map((def) => def.fieldKey)
  );
  const projectValues = valuesByProjectId.get(projectId) ?? new Map<string, string | null>();
  for (const [fieldKey, value] of Object.entries(input)) {
    if (!activeKeys.has(fieldKey)) {
      throw new Error(`Unknown custom field for ${scope}: ${fieldKey}`);
    }
    if (value == null || value.trim().length === 0) {
      projectValues.delete(fieldKey);
    } else {
      projectValues.set(fieldKey, value.trim());
    }
  }
  valuesByProjectId.set(projectId, projectValues);
  return getMockProjectCustomFieldsForProject(projectId, parentProjectId);
}

export function resetMockProjectCustomFieldsStore(): void {
  definitions.length = 0;
  valuesByProjectId.clear();
  nextDefinitionId = 1;
}

export function seedMockProjectCustomFieldExamplesIfEmpty(): void {
  if (definitions.length > 0) return;
  createMockProjectCustomFieldDefinition('Venue', 'project');
  createMockProjectCustomFieldDefinition('Show Organizer', 'project');
  createMockProjectCustomFieldDefinition('Fiancé', 'subproject');
  createMockProjectCustomFieldDefinition('Wedding Date', 'subproject');
}
