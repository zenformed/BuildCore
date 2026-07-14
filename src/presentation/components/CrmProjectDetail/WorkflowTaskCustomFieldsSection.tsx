'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
} from '@/domain/buildcore/workflowTaskCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';
import detailStyles from './ProjectDetail.module.css';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
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
  readonly inlineManage?: boolean;
  readonly onValueChange: (fieldKey: string, value: string) => void;
  readonly onAddField: () => void;
  readonly onFieldDeleted?: (fieldKey: string) => void;
};

function copyForScope(scope: WorkflowTaskCustomFieldScope) {
  return scope === 'payment'
    ? content.projectDetail.payments.customFields
    : content.projectDetail.workflow.customFields;
}

function CustomFieldManageRow({
  definition,
  value,
  disabled,
  isSaving,
  isRenaming,
  renameDraft,
  menuOpen,
  onValueChange,
  onMenuOpenChange,
  onStartRename,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onRequestDelete,
}: {
  readonly definition: WorkflowTaskCustomFieldDefinition;
  readonly value: string;
  readonly disabled: boolean;
  readonly isSaving: boolean;
  readonly isRenaming: boolean;
  readonly renameDraft: string;
  readonly menuOpen: boolean;
  readonly onValueChange: (value: string) => void;
  readonly onMenuOpenChange: (open: boolean) => void;
  readonly onStartRename: () => void;
  readonly onRenameDraftChange: (value: string) => void;
  readonly onCommitRename: () => void;
  readonly onCancelRename: () => void;
  readonly onRequestDelete: () => void;
}): ReactElement {
  const workflowCopy = content.projectDetail.workflow.customFields;
  const copy = copyForScope(definition.scope);
  const inputId = `workflow-task-custom-field-${definition.scope}-${definition.fieldKey}`;
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRenaming) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [isRenaming]);

  return (
    <div className={formStyles.field}>
      <div className={modalStyles.customFieldLabelSlot}>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            className={modalStyles.customFieldLabelEdit}
            value={renameDraft}
            disabled={disabled || isSaving}
            aria-label={copy.labelField}
            onChange={(event) => onRenameDraftChange(event.target.value)}
            onBlur={() => onCommitRename()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                (event.target as HTMLInputElement).blur();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelRename();
              }
            }}
          />
        ) : (
          <label className={`${formStyles.label} ${modalStyles.customFieldLabelPlain}`} htmlFor={inputId}>
            {definition.label}
          </label>
        )}
      </div>
      <div className={formStyles.contactMultiFieldRowInner}>
        <input
          id={inputId}
          type="text"
          className={formStyles.input}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <button
          ref={menuAnchorRef}
          type="button"
          className={detailStyles.taskActionsBtn}
          disabled={disabled || isSaving}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={workflowCopy.fieldMenuAriaLabel(definition.label)}
          onClick={() => onMenuOpenChange(!menuOpen)}
        >
          <span className={detailStyles.taskActionsDots} aria-hidden>
            ⋮
          </span>
        </button>
        <WorkflowInlineMenu
          open={menuOpen}
          onClose={() => onMenuOpenChange(false)}
          anchorRef={menuAnchorRef}
          align="end"
          sizeToContent
          portalClassName={`${detailStyles.inlineMenu_portal} ${detailStyles.actionsMenu_portal} ${detailStyles.inlineMenu_portalAboveOverlay}`}
        >
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem}`}
            disabled={disabled || isSaving}
            onClick={() => {
              onMenuOpenChange(false);
              onStartRename();
            }}
          >
            {workflowCopy.renameAction}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${detailStyles.inlineMenuAction} ${detailStyles.actionsMenuItem} ${detailStyles.actionsMenuItemDanger}`}
            disabled={disabled || isSaving}
            onClick={() => {
              onMenuOpenChange(false);
              onRequestDelete();
            }}
          >
            {workflowCopy.deleteAction}
          </button>
        </WorkflowInlineMenu>
      </div>
    </div>
  );
}

export function WorkflowTaskCustomFieldsSection({
  scope,
  values,
  disabled = false,
  inlineManage = false,
  onValueChange,
  onAddField,
  onFieldDeleted,
}: WorkflowTaskCustomFieldsSectionProps): ReactElement {
  const copy = copyForScope(scope);
  const workflowCopy = content.projectDetail.workflow.customFields;
  const {
    activeDefinitions,
    canManageDefinitions,
    isSaving,
    createDefinition,
    renameDefinition,
    archiveDefinition,
  } = useBuildCoreWorkflowTaskCustomFieldsForScope(scope);

  const [pendingDelete, setPendingDelete] = useState<WorkflowTaskCustomFieldDefinition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamingFieldKey, setRenamingFieldKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [menuFieldKey, setMenuFieldKey] = useState<string | null>(null);
  const [addingInline, setAddingInline] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleStartRename = (definition: WorkflowTaskCustomFieldDefinition) => {
    setMenuFieldKey(null);
    setRenameError(null);
    setRenamingFieldKey(definition.fieldKey);
    setRenameDraft(definition.label);
  };

  const handleCancelRename = () => {
    setRenamingFieldKey(null);
    setRenameDraft('');
  };

  const handleCommitRename = useCallback(
    async (definition: WorkflowTaskCustomFieldDefinition) => {
      if (!inlineManage || !canManageDefinitions) return;
      if (renamingFieldKey !== definition.fieldKey) return;
      const nextLabel = renameDraft.trim();
      if (!nextLabel || nextLabel === definition.label) {
        handleCancelRename();
        return;
      }
      const ok = await renameDefinition(scope, definition.fieldKey, nextLabel);
      if (!ok) {
        setRenameError(workflowCopy.renameFailed);
        setRenameDraft(definition.label);
        return;
      }
      handleCancelRename();
    },
    [
      canManageDefinitions,
      inlineManage,
      renameDefinition,
      renameDraft,
      renamingFieldKey,
      scope,
      workflowCopy.renameFailed,
    ]
  );

  const handleStartInlineAdd = () => {
    if (inlineManage) {
      setAddingInline(true);
      setNewFieldLabel('');
      setCreateError(null);
      return;
    }
    onAddField();
  };

  const handleCancelInlineAdd = () => {
    setAddingInline(false);
    setNewFieldLabel('');
    setCreateError(null);
  };

  const handleConfirmInlineAdd = useCallback(async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    setCreateError(null);
    const created = await createDefinition(label, scope);
    if (!created) {
      setCreateError(copy.createFailed);
      return;
    }
    setAddingInline(false);
    setNewFieldLabel('');
  }, [copy.createFailed, createDefinition, newFieldLabel, scope]);

  const handleConfirmDelete = useCallback(async (): Promise<boolean> => {
    if (pendingDelete == null) return false;
    setDeleteError(null);
    const ok = await archiveDefinition(scope, pendingDelete.fieldKey);
    if (!ok) {
      setDeleteError(workflowCopy.deleteField.failed);
      return false;
    }
    onFieldDeleted?.(pendingDelete.fieldKey);
    return true;
  }, [archiveDefinition, onFieldDeleted, pendingDelete, scope, workflowCopy.deleteField.failed]);

  const showManageControls = inlineManage && canManageDefinitions;

  return (
    <>
      <div className={formStyles.contactMultiSection} aria-label={copy.sectionTitle}>
        <div className={formStyles.contactMultiHeader}>
          <span className={formStyles.label}>{copy.sectionTitle}</span>
          {canManageDefinitions ? (
            <button
              type="button"
              className={formStyles.contactMultiAddOutlineBtn}
              disabled={disabled || isSaving || addingInline}
              onClick={handleStartInlineAdd}
            >
              {copy.addButton}
            </button>
          ) : null}
        </div>

        {renameError ? <p className={formStyles.error}>{renameError}</p> : null}

        {activeDefinitions.length === 0 && !addingInline ? (
          <p className={modalStyles.workflowTaskCustomFieldsEmpty}>{copy.empty}</p>
        ) : (
          activeDefinitions.map((definition) => {
            if (definition.fieldType !== 'text') {
              return (
                <div key={definition.id} className={formStyles.field}>
                  <span className={formStyles.label}>{definition.label}</span>
                  <p className={modalStyles.workflowTaskCustomFieldsEmpty}>{copy.unsupportedType}</p>
                </div>
              );
            }

            if (!showManageControls) {
              const inputId = `workflow-task-custom-field-${definition.scope}-${definition.fieldKey}`;
              return (
                <div key={definition.id} className={formStyles.field}>
                  <label className={formStyles.label} htmlFor={inputId}>
                    {definition.label}
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    className={formStyles.input}
                    value={values[definition.fieldKey] ?? ''}
                    disabled={disabled}
                    onChange={(event) => onValueChange(definition.fieldKey, event.target.value)}
                  />
                </div>
              );
            }

            return (
              <CustomFieldManageRow
                key={definition.id}
                definition={definition}
                value={values[definition.fieldKey] ?? ''}
                disabled={disabled}
                isSaving={isSaving}
                isRenaming={renamingFieldKey === definition.fieldKey}
                renameDraft={renameDraft}
                menuOpen={menuFieldKey === definition.fieldKey}
                onValueChange={(next) => onValueChange(definition.fieldKey, next)}
                onMenuOpenChange={(open) =>
                  setMenuFieldKey(open ? definition.fieldKey : null)
                }
                onStartRename={() => handleStartRename(definition)}
                onRenameDraftChange={(next) => {
                  setRenameDraft(next);
                  setRenameError(null);
                }}
                onCommitRename={() => void handleCommitRename(definition)}
                onCancelRename={handleCancelRename}
                onRequestDelete={() => {
                  setDeleteError(null);
                  setPendingDelete(definition);
                }}
              />
            );
          })
        )}

        {addingInline ? (
          <div className={formStyles.field}>
            <div className={formStyles.contactMultiFieldRowInner}>
              <input
                type="text"
                className={formStyles.input}
                value={newFieldLabel}
                disabled={disabled || isSaving}
                placeholder={workflowCopy.newFieldLabelPlaceholder}
                aria-label={copy.labelField}
                autoFocus
                onChange={(event) => {
                  setNewFieldLabel(event.target.value);
                  setCreateError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleConfirmInlineAdd();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    handleCancelInlineAdd();
                  }
                }}
              />
              <button
                type="button"
                className={formStyles.contactMultiAddOutlineBtn}
                disabled={disabled || isSaving || !newFieldLabel.trim()}
                onClick={() => void handleConfirmInlineAdd()}
              >
                {isSaving ? copy.creating : workflowCopy.saveNewField}
              </button>
              <button
                type="button"
                className={formStyles.cancelButton}
                disabled={disabled || isSaving}
                onClick={handleCancelInlineAdd}
              >
                {workflowCopy.cancelNewField}
              </button>
            </div>
            {createError ? <p className={formStyles.error}>{createError}</p> : null}
          </div>
        ) : null}
      </div>

      <CenterConfirmDialog
        isOpen={pendingDelete != null}
        title={
          pendingDelete != null ? workflowCopy.deleteField.title(pendingDelete.label) : ''
        }
        message={workflowCopy.deleteField.body}
        feedback={deleteError != null ? { kind: 'error', message: deleteError } : null}
        cancelLabel={workflowCopy.deleteField.cancel}
        confirmLabel={isSaving ? workflowCopy.deleteField.deleting : workflowCopy.deleteField.confirm}
        onClose={() => {
          if (isSaving) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          void (async () => {
            const ok = await handleConfirmDelete();
            if (ok) {
              setPendingDelete(null);
              setDeleteError(null);
            }
          })();
        }}
        confirmDisabled={isSaving}
        cancelDisabled={isSaving}
        closeAriaLabel={workflowCopy.deleteField.closeAriaLabel}
      />
    </>
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
