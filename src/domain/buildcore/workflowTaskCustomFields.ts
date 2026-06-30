/**
 * Workflow task custom fields — org-defined schema + per-task values.
 * Completely separate from buildcore field labels (core column rename).
 */

export const BUILDCORE_WORKFLOW_TASK_CUSTOM_FIELD_LABEL_MAX_LENGTH = 80;

export const WORKFLOW_TASK_CUSTOM_FIELD_TYPES = ['text'] as const;

export type WorkflowTaskCustomFieldType = (typeof WORKFLOW_TASK_CUSTOM_FIELD_TYPES)[number];

export type WorkflowTaskCustomFieldSource = 'user' | 'import';

export const WORKFLOW_TASK_CUSTOM_FIELD_SCOPES = ['workflow_task', 'payment'] as const;

export type WorkflowTaskCustomFieldScope = (typeof WORKFLOW_TASK_CUSTOM_FIELD_SCOPES)[number];

export type WorkflowTaskCustomFieldDefinition = {
  readonly id: string;
  readonly fieldKey: string;
  readonly label: string;
  readonly fieldType: WorkflowTaskCustomFieldType;
  readonly scope: WorkflowTaskCustomFieldScope;
  readonly displayOrder: number;
  readonly isArchived: boolean;
  readonly source: WorkflowTaskCustomFieldSource;
};

/** fieldKey → trimmed text value or null when empty. */
export type WorkflowTaskCustomFieldsMap = Readonly<Record<string, string | null>>;

export type WorkflowTaskCustomFieldValuesInput = WorkflowTaskCustomFieldsMap;

export type WorkflowTaskCustomFieldValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function slugifyWorkflowTaskCustomFieldKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return slug.length > 0 ? slug : 'field';
}

export function validateWorkflowTaskCustomFieldLabel(
  label: string
): WorkflowTaskCustomFieldValidationResult {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, message: 'Label is required.' };
  }
  if (trimmed.length > BUILDCORE_WORKFLOW_TASK_CUSTOM_FIELD_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Label must be ${BUILDCORE_WORKFLOW_TASK_CUSTOM_FIELD_LABEL_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function isWorkflowTaskCustomFieldType(value: string): value is WorkflowTaskCustomFieldType {
  return (WORKFLOW_TASK_CUSTOM_FIELD_TYPES as readonly string[]).includes(value);
}

export function isWorkflowTaskCustomFieldScope(value: string): value is WorkflowTaskCustomFieldScope {
  return (WORKFLOW_TASK_CUSTOM_FIELD_SCOPES as readonly string[]).includes(value);
}

export function resolveWorkflowTaskCustomFieldScopeForTask(task: {
  amountCents?: number | null;
}): WorkflowTaskCustomFieldScope {
  return task.amountCents != null ? 'payment' : 'workflow_task';
}

export function resolveWorkflowTaskCustomFieldScopeFromModalContext(
  context: 'workflow' | 'payment'
): WorkflowTaskCustomFieldScope {
  return context === 'payment' ? 'payment' : 'workflow_task';
}

export function normalizeWorkflowTaskCustomFieldTextValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseWorkflowTaskCustomFieldValuesInput(
  value: unknown
): WorkflowTaskCustomFieldValuesInput | null {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Record<string, string | null> = {};
  for (const [fieldKey, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof fieldKey !== 'string' || fieldKey.trim().length === 0) return null;
    if (raw !== null && typeof raw !== 'string') return null;
    result[fieldKey.trim()] = normalizeWorkflowTaskCustomFieldTextValue(raw);
  }
  return result;
}

export function sortWorkflowTaskCustomFieldDefinitions(
  definitions: readonly WorkflowTaskCustomFieldDefinition[]
): WorkflowTaskCustomFieldDefinition[] {
  return [...definitions].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.label.localeCompare(b.label);
  });
}

export function listActiveWorkflowTaskCustomFieldDefinitions(
  definitions: readonly WorkflowTaskCustomFieldDefinition[]
): WorkflowTaskCustomFieldDefinition[] {
  return sortWorkflowTaskCustomFieldDefinitions(definitions.filter((def) => !def.isArchived));
}

export function listActiveWorkflowTaskCustomFieldDefinitionsForScope(
  definitions: readonly WorkflowTaskCustomFieldDefinition[],
  scope: WorkflowTaskCustomFieldScope
): WorkflowTaskCustomFieldDefinition[] {
  return listActiveWorkflowTaskCustomFieldDefinitions(
    definitions.filter((def) => def.scope === scope)
  );
}
