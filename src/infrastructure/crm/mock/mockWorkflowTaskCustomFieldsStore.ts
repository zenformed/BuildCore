import type { WorkflowTaskCustomFieldDefinition } from '@/domain/buildcore/workflowTaskCustomFields';
import type { WorkflowTaskCustomFieldScope } from '@/domain/buildcore/workflowTaskCustomFields';
import {
  listActiveWorkflowTaskCustomFieldDefinitionsForScope,
  slugifyWorkflowTaskCustomFieldKey,
  sortWorkflowTaskCustomFieldDefinitions,
  validateWorkflowTaskCustomFieldLabel,
} from '@/domain/buildcore/workflowTaskCustomFields';
import type { BuildCoreWorkflowTaskCustomFieldsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskCustomFieldService';

type MockCustomFieldValueStore = Map<string, Map<string, string | null>>;

const definitions: WorkflowTaskCustomFieldDefinition[] = [];
const valuesByTaskId: MockCustomFieldValueStore = new Map();
let nextDefinitionId = 1;

function resolveUniqueFieldKey(scope: WorkflowTaskCustomFieldScope, baseKey: string): string {
  const existing = new Set(
    definitions.filter((def) => def.scope === scope).map((def) => def.fieldKey)
  );
  if (!existing.has(baseKey)) return baseKey;
  let suffix = 2;
  while (existing.has(`${baseKey}_${suffix}`)) suffix += 1;
  return `${baseKey}_${suffix}`;
}

export function getMockWorkflowTaskCustomFieldsResponse(
  canManage = true
): BuildCoreWorkflowTaskCustomFieldsResponse {
  return {
    definitions: sortWorkflowTaskCustomFieldDefinitions(definitions),
    canManage,
  };
}

export function createMockWorkflowTaskCustomFieldDefinition(
  label: string,
  scope: WorkflowTaskCustomFieldScope
): WorkflowTaskCustomFieldDefinition {
  const validated = validateWorkflowTaskCustomFieldLabel(label);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  const fieldKey = resolveUniqueFieldKey(scope, slugifyWorkflowTaskCustomFieldKey(validated.value));
  const scopedDefinitions = definitions.filter((def) => def.scope === scope);
  const definition: WorkflowTaskCustomFieldDefinition = {
    id: `mock-custom-field-${nextDefinitionId++}`,
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

export function updateMockWorkflowTaskCustomFieldDefinition(
  scope: WorkflowTaskCustomFieldScope,
  fieldKey: string,
  patch: { label?: string; isArchived?: boolean }
): WorkflowTaskCustomFieldDefinition {
  const index = definitions.findIndex((def) => def.scope === scope && def.fieldKey === fieldKey);
  if (index < 0) throw new Error('Custom field not found.');
  const current = definitions[index]!;
  if (patch.label !== undefined) {
    const validated = validateWorkflowTaskCustomFieldLabel(patch.label);
    if (!validated.ok) throw new Error(validated.message);
    definitions[index] = { ...current, label: validated.value };
  }
  if (patch.isArchived !== undefined) {
    definitions[index] = { ...definitions[index]!, isArchived: patch.isArchived };
  }
  return definitions[index]!;
}

export function getMockActiveWorkflowTaskCustomFieldDefinitions(
  scope?: WorkflowTaskCustomFieldScope
): WorkflowTaskCustomFieldDefinition[] {
  if (scope == null) {
    return sortWorkflowTaskCustomFieldDefinitions(definitions.filter((def) => !def.isArchived));
  }
  return listActiveWorkflowTaskCustomFieldDefinitionsForScope(definitions, scope);
}

export function getMockWorkflowTaskCustomFieldsForTask(
  taskId: string,
  scope: WorkflowTaskCustomFieldScope
): Record<string, string | null> {
  const taskValues = valuesByTaskId.get(taskId);
  if (!taskValues) return {};
  const activeKeys = new Set(
    getMockActiveWorkflowTaskCustomFieldDefinitions(scope).map((def) => def.fieldKey)
  );
  const result: Record<string, string | null> = {};
  for (const [fieldKey, value] of taskValues.entries()) {
    if (activeKeys.has(fieldKey)) result[fieldKey] = value;
  }
  return result;
}

export function upsertMockWorkflowTaskCustomFieldValues(
  taskId: string,
  scope: WorkflowTaskCustomFieldScope,
  input: Readonly<Record<string, string | null>>
): Record<string, string | null> {
  const activeKeys = new Set(
    getMockActiveWorkflowTaskCustomFieldDefinitions(scope).map((def) => def.fieldKey)
  );
  const taskValues = valuesByTaskId.get(taskId) ?? new Map<string, string | null>();
  for (const [fieldKey, value] of Object.entries(input)) {
    if (!activeKeys.has(fieldKey)) {
      throw new Error(`Unknown custom field for ${scope}: ${fieldKey}`);
    }
    if (value == null || value.trim().length === 0) {
      taskValues.delete(fieldKey);
    } else {
      taskValues.set(fieldKey, value.trim());
    }
  }
  valuesByTaskId.set(taskId, taskValues);
  return getMockWorkflowTaskCustomFieldsForTask(taskId, scope);
}

export function resetMockWorkflowTaskCustomFieldsStore(): void {
  definitions.length = 0;
  valuesByTaskId.clear();
  nextDefinitionId = 1;
}

export function seedMockWorkflowTaskCustomFieldExamplesIfEmpty(): void {
  if (definitions.length > 0) return;
  createMockWorkflowTaskCustomFieldDefinition('Vendor', 'workflow_task');
  createMockWorkflowTaskCustomFieldDefinition('Invoice #', 'payment');
}
