/**
 * BuildCore field label registry.
 *
 * field_key — stable UI/business identity (settings, imports, column headers).
 * internalField — actual DB/API column/property (display-only mapping).
 * label — cosmetic display text; never changes persistence behavior.
 */

export const BUILDCORE_FIELD_LABEL_MAX_LENGTH = 40;

export type BuildCoreFieldLabelScope = 'workflow_task';

export type BuildCoreFieldLabelRegistryEntry = {
  readonly fieldKey: string;
  readonly defaultLabel: string;
  readonly internalField: string;
  readonly scope: BuildCoreFieldLabelScope;
  readonly editable: boolean;
};

export const WORKFLOW_TASK_TASK_FIELD_KEY = 'workflow_task.task' as const;
export const WORKFLOW_TASK_ASSIGNED_FIELD_KEY = 'workflow_task.assigned' as const;
export const WORKFLOW_TASK_STATUS_FIELD_KEY = 'workflow_task.status' as const;
export const WORKFLOW_TASK_DUE_FIELD_KEY = 'workflow_task.due' as const;
export const WORKFLOW_TASK_DOCUMENTS_FIELD_KEY = 'workflow_task.documents' as const;
export const WORKFLOW_TASK_NOTES_FIELD_KEY = 'workflow_task.notes' as const;
export const WORKFLOW_TASK_ACTIONS_FIELD_KEY = 'workflow_task.actions' as const;

export type RegisteredBuildCoreFieldKey =
  | typeof WORKFLOW_TASK_TASK_FIELD_KEY
  | typeof WORKFLOW_TASK_ASSIGNED_FIELD_KEY
  | typeof WORKFLOW_TASK_STATUS_FIELD_KEY
  | typeof WORKFLOW_TASK_DUE_FIELD_KEY
  | typeof WORKFLOW_TASK_DOCUMENTS_FIELD_KEY
  | typeof WORKFLOW_TASK_NOTES_FIELD_KEY
  | typeof WORKFLOW_TASK_ACTIONS_FIELD_KEY;

export const BUILDCORE_FIELD_LABEL_REGISTRY: Readonly<
  Record<RegisteredBuildCoreFieldKey, BuildCoreFieldLabelRegistryEntry>
> = {
  [WORKFLOW_TASK_TASK_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_TASK_FIELD_KEY,
    defaultLabel: 'Task',
    internalField: 'title',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_ASSIGNED_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
    defaultLabel: 'Assigned',
    internalField: 'assignedTo',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_STATUS_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_STATUS_FIELD_KEY,
    defaultLabel: 'Status',
    internalField: 'status',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_DUE_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_DUE_FIELD_KEY,
    defaultLabel: 'Due',
    internalField: 'dueAt',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_DOCUMENTS_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
    defaultLabel: 'Documents',
    internalField: 'documents',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_NOTES_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_NOTES_FIELD_KEY,
    defaultLabel: 'Notes',
    internalField: 'notes',
    scope: 'workflow_task',
    editable: true,
  },
  [WORKFLOW_TASK_ACTIONS_FIELD_KEY]: {
    fieldKey: WORKFLOW_TASK_ACTIONS_FIELD_KEY,
    defaultLabel: 'Actions',
    internalField: 'actions',
    scope: 'workflow_task',
    editable: false,
  },
};

export const REGISTERED_BUILDCORE_FIELD_KEYS = Object.keys(
  BUILDCORE_FIELD_LABEL_REGISTRY
) as RegisteredBuildCoreFieldKey[];

export function isRegisteredBuildCoreFieldKey(
  fieldKey: string
): fieldKey is RegisteredBuildCoreFieldKey {
  return Object.prototype.hasOwnProperty.call(BUILDCORE_FIELD_LABEL_REGISTRY, fieldKey);
}

export function getBuildCoreFieldLabelRegistryEntry(
  fieldKey: string
): BuildCoreFieldLabelRegistryEntry | null {
  if (!isRegisteredBuildCoreFieldKey(fieldKey)) return null;
  return BUILDCORE_FIELD_LABEL_REGISTRY[fieldKey];
}

export function buildDefaultBuildCoreFieldLabels(): Record<string, string> {
  return Object.fromEntries(
    REGISTERED_BUILDCORE_FIELD_KEYS.map((key) => [
      key,
      BUILDCORE_FIELD_LABEL_REGISTRY[key].defaultLabel,
    ])
  );
}

export type BuildCoreFieldLabelValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function normalizeBuildCoreFieldLabelDisplay(label: string): string {
  return label.trim().toLocaleUpperCase('en-US');
}

export function validateBuildCoreFieldLabelValue(
  label: string
): BuildCoreFieldLabelValidationResult {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, message: 'Label is required.' };
  }
  const normalized = normalizeBuildCoreFieldLabelDisplay(trimmed);
  if (normalized.length > BUILDCORE_FIELD_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Label must be ${BUILDCORE_FIELD_LABEL_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: normalized };
}
