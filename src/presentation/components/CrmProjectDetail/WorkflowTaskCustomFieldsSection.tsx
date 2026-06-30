'use client';

import type { ReactElement } from 'react';
import type {
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
} from '@/domain/buildcore/workflowTaskCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';
import modalStyles from './WorkflowTaskModal.module.css';

export type WorkflowTaskCustomFieldCopy = {
  readonly sectionTitle: string;
  readonly empty: string;
  readonly addButton: string;
  readonly unsupportedType: string;
};

export type WorkflowTaskCustomFieldsSectionProps = {
  readonly scope: WorkflowTaskCustomFieldScope;
  readonly values: Readonly<Record<string, string>>;
  readonly disabled?: boolean;
  readonly onValueChange: (fieldKey: string, value: string) => void;
  readonly onAddField: () => void;
};

function renderFieldInput(
  definition: WorkflowTaskCustomFieldDefinition,
  value: string,
  disabled: boolean,
  unsupportedTypeCopy: string,
  onValueChange: (fieldKey: string, value: string) => void
): ReactElement {
  const inputId = `workflow-task-custom-field-${definition.scope}-${definition.fieldKey}`;
  if (definition.fieldType === 'text') {
    return (
      <div key={definition.id} className={formStyles.field}>
        <label className={formStyles.label} htmlFor={inputId}>
          {definition.label}
        </label>
        <input
          id={inputId}
          type="text"
          className={formStyles.input}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(definition.fieldKey, event.target.value)}
        />
      </div>
    );
  }

  return (
    <div key={definition.id} className={formStyles.field}>
      <span className={formStyles.label}>{definition.label}</span>
      <p className={modalStyles.workflowTaskCustomFieldsEmpty}>{unsupportedTypeCopy}</p>
    </div>
  );
}

function copyForScope(scope: WorkflowTaskCustomFieldScope): WorkflowTaskCustomFieldCopy {
  return scope === 'payment'
    ? content.projectDetail.payments.customFields
    : content.projectDetail.workflow.customFields;
}

export function WorkflowTaskCustomFieldsSection({
  scope,
  values,
  disabled = false,
  onValueChange,
  onAddField,
}: WorkflowTaskCustomFieldsSectionProps): ReactElement {
  const copy = copyForScope(scope);
  const { activeDefinitions, canManageDefinitions, isSaving } =
    useBuildCoreWorkflowTaskCustomFieldsForScope(scope);

  return (
    <div className={formStyles.contactMultiSection} aria-label={copy.sectionTitle}>
      <div className={formStyles.contactMultiHeader}>
        <span className={formStyles.label}>{copy.sectionTitle}</span>
        {canManageDefinitions ? (
          <button
            type="button"
            className={formStyles.contactMultiAddOutlineBtn}
            disabled={disabled || isSaving}
            onClick={onAddField}
          >
            {copy.addButton}
          </button>
        ) : null}
      </div>
      {activeDefinitions.length === 0 ? (
        <p className={modalStyles.workflowTaskCustomFieldsEmpty}>{copy.empty}</p>
      ) : (
        activeDefinitions.map((definition) =>
          renderFieldInput(
            definition,
            values[definition.fieldKey] ?? '',
            disabled,
            copy.unsupportedType,
            onValueChange
          )
        )
      )}
    </div>
  );
}

export function buildWorkflowTaskCustomFieldValuesPayload(
  activeDefinitions: readonly WorkflowTaskCustomFieldDefinition[],
  draftValues: Readonly<Record<string, string>>
): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  for (const definition of activeDefinitions) {
    const raw = draftValues[definition.fieldKey] ?? '';
    const trimmed = raw.trim();
    payload[definition.fieldKey] = trimmed.length > 0 ? trimmed : null;
  }
  return payload;
}

export function buildWorkflowTaskCustomFieldDraftFromTask(
  activeDefinitions: readonly WorkflowTaskCustomFieldDefinition[],
  customFields: Readonly<Record<string, string | null>> | undefined
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const definition of activeDefinitions) {
    draft[definition.fieldKey] = customFields?.[definition.fieldKey] ?? '';
  }
  return draft;
}
