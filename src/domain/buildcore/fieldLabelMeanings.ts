/**
 * Contextual plain-English meanings for BuildCore field labels.
 *
 * Meanings are code-only (never stored in DB). Wording depends on where the
 * field is rendered (workflow table vs payments rail, etc.).
 */

import {
  isRegisteredBuildCoreFieldKey,
  type RegisteredBuildCoreFieldKey,
  WORKFLOW_TASK_ACTIONS_FIELD_KEY,
  WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
  WORKFLOW_TASK_NOTES_FIELD_KEY,
  WORKFLOW_TASK_STATUS_FIELD_KEY,
  WORKFLOW_TASK_TASK_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';

export const BUILDCORE_FIELD_LABEL_CONTEXTS = ['workflow', 'payments'] as const;

export type BuildCoreFieldLabelContext = (typeof BUILDCORE_FIELD_LABEL_CONTEXTS)[number];

type FieldMeaningByKey = Partial<Record<RegisteredBuildCoreFieldKey, string>>;

const FIELD_MEANINGS_BY_CONTEXT: Readonly<
  Record<BuildCoreFieldLabelContext, FieldMeaningByKey>
> = {
  workflow: {
    [WORKFLOW_TASK_TASK_FIELD_KEY]: 'Workflow Task Name',
    [WORKFLOW_TASK_STATUS_FIELD_KEY]: 'Workflow Task Status',
    [WORKFLOW_TASK_ASSIGNED_FIELD_KEY]: 'Workflow Task Assignee',
    [WORKFLOW_TASK_DUE_FIELD_KEY]: 'Workflow Task Due Date',
    [WORKFLOW_TASK_NOTES_FIELD_KEY]: 'Workflow Task Notes',
    [WORKFLOW_TASK_DOCUMENTS_FIELD_KEY]: 'Workflow Task Documents',
    [WORKFLOW_TASK_ACTIONS_FIELD_KEY]: 'Workflow Task Actions',
  },
  payments: {
    [WORKFLOW_TASK_TASK_FIELD_KEY]: 'Payment Name',
    [WORKFLOW_TASK_STATUS_FIELD_KEY]: 'Payment Status',
    [WORKFLOW_TASK_ASSIGNED_FIELD_KEY]: 'Payment Assignee',
    [WORKFLOW_TASK_DUE_FIELD_KEY]: 'Payment Due Date',
    [WORKFLOW_TASK_NOTES_FIELD_KEY]: 'Payment Notes',
    [WORKFLOW_TASK_DOCUMENTS_FIELD_KEY]: 'Payment Documents',
    [WORKFLOW_TASK_ACTIONS_FIELD_KEY]: 'Payment Actions',
  },
};

export function isBuildCoreFieldLabelContext(
  value: string
): value is BuildCoreFieldLabelContext {
  return (BUILDCORE_FIELD_LABEL_CONTEXTS as readonly string[]).includes(value);
}

export function getFieldMeaning(
  fieldKey: string,
  context: BuildCoreFieldLabelContext
): string | null {
  if (!isRegisteredBuildCoreFieldKey(fieldKey)) return null;
  return FIELD_MEANINGS_BY_CONTEXT[context][fieldKey] ?? null;
}
