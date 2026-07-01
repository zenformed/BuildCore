'use client';

import { useCallback, useState, type ReactElement } from 'react';
import type {
  ProjectCustomFieldDefinition,
  ProjectCustomFieldScope,
} from '@/domain/buildcore/projectCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreProjectCustomFieldsForScope } from '@/presentation/providers/BuildCoreProjectCustomFieldsProvider';
import { DeleteProjectCustomFieldDialog } from './DeleteProjectCustomFieldDialog';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';
import modalStyles from '../CrmProjectDetail/WorkflowTaskModal.module.css';

export type ProjectCustomFieldCopy = {
  readonly sectionTitle: string;
  readonly empty: string;
  readonly addButton: string;
  readonly unsupportedType: string;
  readonly removeAriaLabel: (label: string) => string;
};

export type ProjectCustomFieldsSectionProps = {
  readonly scope: ProjectCustomFieldScope;
  readonly values: Readonly<Record<string, string>>;
  readonly disabled?: boolean;
  readonly onValueChange: (fieldKey: string, value: string) => void;
  readonly onAddField: () => void;
  readonly onFieldDeleted?: (fieldKey: string) => void;
};

function ContactRemoveIcon(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function copyForScope(scope: ProjectCustomFieldScope): ProjectCustomFieldCopy {
  return scope === 'project'
    ? content.crm.projectCustomFields.project
    : content.crm.projectCustomFields.subproject;
}

function renderFieldInput(
  definition: ProjectCustomFieldDefinition,
  value: string,
  disabled: boolean,
  canManageDefinitions: boolean,
  isSaving: boolean,
  unsupportedTypeCopy: string,
  removeAriaLabel: (label: string) => string,
  onValueChange: (fieldKey: string, value: string) => void,
  onRequestDelete: (definition: ProjectCustomFieldDefinition) => void
): ReactElement {
  const inputId = `project-custom-field-${definition.scope}-${definition.fieldKey}`;
  if (definition.fieldType === 'text') {
    return (
      <div key={definition.id} className={formStyles.field}>
        <label className={formStyles.label} htmlFor={inputId}>
          {definition.label}
        </label>
        <div className={formStyles.contactMultiFieldRowInner}>
          <input
            id={inputId}
            type="text"
            className={formStyles.input}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(definition.fieldKey, event.target.value)}
          />
          {canManageDefinitions ? (
            <button
              type="button"
              className={formStyles.contactMultiRemoveBtn}
              onClick={() => onRequestDelete(definition)}
              disabled={disabled || isSaving}
              aria-label={removeAriaLabel(definition.label)}
            >
              <ContactRemoveIcon />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div key={definition.id} className={formStyles.field}>
      <span className={formStyles.label}>{definition.label}</span>
      <p className={modalStyles.workflowTaskCustomFieldsEmpty}>{unsupportedTypeCopy}</p>
      {canManageDefinitions ? (
        <button
          type="button"
          className={formStyles.contactMultiRemoveBtn}
          onClick={() => onRequestDelete(definition)}
          disabled={disabled || isSaving}
          aria-label={removeAriaLabel(definition.label)}
        >
          <ContactRemoveIcon />
        </button>
      ) : null}
    </div>
  );
}

export function ProjectCustomFieldsSection({
  scope,
  values,
  disabled = false,
  onValueChange,
  onAddField,
  onFieldDeleted,
}: ProjectCustomFieldsSectionProps): ReactElement {
  const copy = copyForScope(scope);
  const { activeDefinitions, canManageDefinitions, isSaving, archiveDefinition } =
    useBuildCoreProjectCustomFieldsForScope(scope);
  const [pendingDelete, setPendingDelete] = useState<ProjectCustomFieldDefinition | null>(null);

  const handleRequestDelete = useCallback((definition: ProjectCustomFieldDefinition) => {
    setPendingDelete(definition);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async (): Promise<boolean> => {
    if (pendingDelete == null) return false;
    const ok = await archiveDefinition(scope, pendingDelete.fieldKey);
    if (!ok) return false;
    onFieldDeleted?.(pendingDelete.fieldKey);
    return true;
  }, [archiveDefinition, onFieldDeleted, pendingDelete, scope]);

  return (
    <>
      <div
        className={`${formStyles.contactMultiSection} ${formStyles.projectCustomFieldsSection}`}
        aria-label={copy.sectionTitle}
      >
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
          <p className={formStyles.projectCustomFieldsEmpty}>{copy.empty}</p>
        ) : (
          activeDefinitions.map((definition) =>
            renderFieldInput(
              definition,
              values[definition.fieldKey] ?? '',
              disabled,
              canManageDefinitions,
              isSaving,
              copy.unsupportedType,
              copy.removeAriaLabel,
              onValueChange,
              handleRequestDelete
            )
          )
        )}
      </div>
      {pendingDelete != null ? (
        <DeleteProjectCustomFieldDialog
          isOpen
          saving={isSaving}
          scope={scope}
          fieldLabel={pendingDelete.label}
          onClose={handleCloseDelete}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </>
  );
}

export function buildProjectCustomFieldValuesPayload(
  activeDefinitions: readonly ProjectCustomFieldDefinition[],
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

export function buildProjectCustomFieldDraftFromSummary(
  activeDefinitions: readonly ProjectCustomFieldDefinition[],
  customFields: Readonly<Record<string, string | null>> | undefined
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const definition of activeDefinitions) {
    draft[definition.fieldKey] = customFields?.[definition.fieldKey] ?? '';
  }
  return draft;
}
