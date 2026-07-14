'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import type { PaymentTableColumnPosition } from '@/domain/buildcore/paymentTableColumns';
import { BUILDCORE_WORKFLOW_TASK_CUSTOM_FIELD_LABEL_MAX_LENGTH } from '@/domain/buildcore/workflowTaskCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import { useBuildCorePaymentTableColumns } from '@/presentation/providers/BuildCorePaymentTableColumnsProvider';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import { AddWorkflowTaskCustomFieldDialog } from './AddWorkflowTaskCustomFieldDialog';
import styles from './ProjectDetail.module.css';

const tableCopy = content.projectDetail.payments.tableColumns;
const customFieldCopy = content.projectDetail.payments.customFields;

const PAYMENT_TABLE_CUSTOM_COLUMN_TEXT_MAX_LENGTH = 15;

function truncatePaymentTableCustomColumnText(value: string): string {
  if (value.length <= PAYMENT_TABLE_CUSTOM_COLUMN_TEXT_MAX_LENGTH) return value;
  return `${value.slice(0, PAYMENT_TABLE_CUSTOM_COLUMN_TEXT_MAX_LENGTH)}…`;
}

function paymentTableCustomColumnTextTitle(value: string): string | undefined {
  return value.length > PAYMENT_TABLE_CUSTOM_COLUMN_TEXT_MAX_LENGTH ? value : undefined;
}

function EditablePaymentCustomFieldColumnHeader({
  fieldKey,
  label,
  position,
}: {
  readonly fieldKey: string;
  readonly label: string;
  readonly position: PaymentTableColumnPosition;
}): ReactElement {
  const { canManageColumns, isSaving: isSavingColumn, setTableColumn } = useBuildCorePaymentTableColumns();
  const {
    renameDefinition,
    archiveDefinition,
    createDefinition,
    refetch,
    isSaving: isSavingDefinition,
  } = useBuildCoreWorkflowTaskCustomFieldsForScope('payment');
  const { setToast } = useProjectDetailShell();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saving = isSavingColumn || isSavingDefinition;

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [editing, label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(label);
    setEditing(false);
  }, [label]);

  const saveRename = useCallback(async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed) {
      setDraft(label);
      setToast({ kind: 'error', message: 'Label is required.' });
      return;
    }
    if (trimmed === label.trim()) {
      setDraft(label);
      return;
    }
    const ok = await renameDefinition('payment', fieldKey, trimmed);
    if (!ok) {
      setDraft(label);
      setToast({ kind: 'error', message: tableCopy.renameFailed });
    }
  }, [draft, fieldKey, label, renameDefinition, setToast]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void saveRename();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    },
    [cancel, saveRename]
  );

  const handleRemove = useCallback(async () => {
    setMenuOpen(false);
    const ok = await setTableColumn(position, null);
    if (!ok) setToast({ kind: 'error', message: tableCopy.setColumnFailed });
  }, [position, setTableColumn, setToast]);

  const handleArchive = useCallback(async () => {
    setMenuOpen(false);
    const ok = await archiveDefinition('payment', fieldKey);
    if (!ok) {
      setToast({ kind: 'error', message: tableCopy.archiveFailed });
      return;
    }
    await setTableColumn(position, null);
  }, [archiveDefinition, fieldKey, position, setTableColumn, setToast]);

  const handleCreateField = useCallback(
    async (newLabel: string) => {
      const created = await createDefinition(newLabel, 'payment');
      if (created == null) return false;
      await refetch();
      const ok = await setTableColumn(position, created.fieldKey);
      if (!ok) {
        setToast({ kind: 'error', message: tableCopy.setColumnFailed });
        return false;
      }
      return true;
    },
    [createDefinition, position, refetch, setTableColumn, setToast]
  );

  const visibleLabel = truncatePaymentTableCustomColumnText(label);
  const labelTitle = paymentTableCustomColumnTextTitle(label);

  const labelControl =
    editing && canManageColumns ? (
      <input
        ref={inputRef}
        type="text"
        className={styles.workflowColumnHeaderInput}
        value={draft}
        maxLength={BUILDCORE_WORKFLOW_TASK_CUSTOM_FIELD_LABEL_MAX_LENGTH}
        disabled={saving}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void saveRename()}
        onKeyDown={onKeyDown}
      />
    ) : canManageColumns ? (
      <button
        type="button"
        className={`${styles.workflowColumnHeaderLabelBtn} ${styles.workflowCustomColumnLabelBtn}`}
        disabled={saving}
        aria-label={`${label}. Click to rename column.`}
        title={labelTitle}
        onClick={() => {
          setDraft(label);
          setEditing(true);
        }}
      >
        <span className={styles.workflowColumnHeaderLabelText}>{visibleLabel}</span>
      </button>
    ) : (
      <span className={styles.workflowColumnHeaderLabelText} title={labelTitle}>
        {visibleLabel}
      </span>
    );

  return (
    <span
      role="columnheader"
      className={styles.workflowCustomColumnHeader}
      aria-busy={saving || undefined}
    >
      {labelControl}
      {canManageColumns ? (
        <>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.workflowCustomColumnMenuBtn}
            aria-label={tableCopy.menuAriaLabel}
            disabled={saving}
            onClick={() => {
              setPickerOpen(false);
              setMenuOpen((open) => !open);
            }}
          >
            ⋮
          </button>
          <WorkflowInlineMenu
            open={menuOpen}
            anchorRef={menuButtonRef}
            align="end"
            sizeToContent
            onClose={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className={styles.inlineMenuAction}
              onClick={() => {
                setMenuOpen(false);
                setPickerOpen(true);
              }}
            >
              {tableCopy.replaceColumn}
            </button>
            <button type="button" className={styles.inlineMenuAction} onClick={() => void handleRemove()}>
              {tableCopy.removeFromTable}
            </button>
            <button
              type="button"
              className={styles.inlineMenuAction}
              onClick={() => {
                setMenuOpen(false);
                setDraft(label);
                setEditing(true);
              }}
            >
              {tableCopy.renameField}
            </button>
            <button type="button" className={styles.inlineMenuAction} onClick={() => void handleArchive()}>
              {tableCopy.archiveField}
            </button>
          </WorkflowInlineMenu>
          <PaymentCustomColumnPicker
            open={pickerOpen}
            position={position}
            excludeFieldKeys={[fieldKey]}
            anchorRef={menuButtonRef}
            onClose={() => setPickerOpen(false)}
            onCreateRequested={() => {
              setPickerOpen(false);
              setCreateDialogOpen(true);
            }}
          />
          <AddWorkflowTaskCustomFieldDialog
            isOpen={createDialogOpen}
            saving={isSavingDefinition}
            copy={customFieldCopy}
            onClose={() => setCreateDialogOpen(false)}
            onCreate={handleCreateField}
          />
        </>
      ) : null}
    </span>
  );
}

function PaymentCustomColumnAddHeader({
  position,
}: {
  readonly position: PaymentTableColumnPosition;
}): ReactElement {
  const { isSaving } = useBuildCorePaymentTableColumns();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { createDefinition, isSaving: isSavingDefinition, refetch } =
    useBuildCoreWorkflowTaskCustomFieldsForScope('payment');
  const { setTableColumn } = useBuildCorePaymentTableColumns();
  const { setToast } = useProjectDetailShell();

  const handleCreate = useCallback(
    async (label: string) => {
      const created = await createDefinition(label, 'payment');
      if (created == null) return false;
      await refetch();
      const ok = await setTableColumn(position, created.fieldKey);
      if (!ok) {
        setToast({ kind: 'error', message: tableCopy.setColumnFailed });
        return false;
      }
      return true;
    },
    [createDefinition, position, refetch, setTableColumn, setToast]
  );

  return (
    <span role="columnheader" className={styles.workflowCustomColumnHeader}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.workflowCustomColumnAddBtn}
        aria-label={tableCopy.addColumnAriaLabel}
        disabled={isSaving || isSavingDefinition}
        onClick={() => setPickerOpen(true)}
      >
        {tableCopy.addColumn}
      </button>
      <PaymentCustomColumnPicker
        open={pickerOpen}
        position={position}
        anchorRef={buttonRef}
        onClose={() => setPickerOpen(false)}
        onCreateRequested={() => {
          setPickerOpen(false);
          setCreateDialogOpen(true);
        }}
      />
      <AddWorkflowTaskCustomFieldDialog
        isOpen={createDialogOpen}
        saving={isSavingDefinition}
        copy={customFieldCopy}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />
    </span>
  );
}

function PaymentCustomColumnPicker({
  open,
  position,
  anchorRef,
  excludeFieldKeys = [],
  onClose,
  onCreateRequested,
}: {
  readonly open: boolean;
  readonly position: PaymentTableColumnPosition;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly excludeFieldKeys?: readonly string[];
  readonly onClose: () => void;
  readonly onCreateRequested: () => void;
}): ReactElement {
  const { activeDefinitions } = useBuildCoreWorkflowTaskCustomFieldsForScope('payment');
  const { slots, setTableColumn } = useBuildCorePaymentTableColumns();
  const { setToast } = useProjectDetailShell();
  const excluded = useMemo(() => new Set(excludeFieldKeys), [excludeFieldKeys]);
  const usedKeys = useMemo(
    () => new Set([slots.slot1, slots.slot2].filter((key): key is string => key != null)),
    [slots.slot1, slots.slot2]
  );

  const options = activeDefinitions.filter(
    (definition) => !excluded.has(definition.fieldKey) && !usedKeys.has(definition.fieldKey)
  );

  const handleSelect = useCallback(
    async (fieldKey: string) => {
      onClose();
      const ok = await setTableColumn(position, fieldKey);
      if (!ok) setToast({ kind: 'error', message: tableCopy.setColumnFailed });
    },
    [onClose, position, setTableColumn, setToast]
  );

  return (
    <WorkflowInlineMenu open={open} anchorRef={anchorRef} align="start" sizeToContent onClose={onClose}>
      <div className={styles.workflowCustomColumnPickerTitle}>{tableCopy.pickerTitle}</div>
      {options.length === 0 ? (
        <p className={styles.workflowCustomColumnPickerEmpty}>{tableCopy.noCustomFields}</p>
      ) : (
        options.map((definition) => (
          <button
            key={definition.id}
            type="button"
            className={styles.inlineMenuAction}
            onClick={() => void handleSelect(definition.fieldKey)}
          >
            {definition.label}
          </button>
        ))
      )}
      <div className={styles.workflowCustomColumnPickerDivider} role="separator" />
      <button type="button" className={styles.inlineMenuAction} onClick={onCreateRequested}>
        {tableCopy.createCustomField}
      </button>
    </WorkflowInlineMenu>
  );
}

export function PaymentTableCustomColumnHeaders(): ReactElement | null {
  const { slotViews, customColumnCount, getDefinitionForFieldKey } = useBuildCorePaymentTableColumns();

  if (customColumnCount === 0) return null;

  return (
    <>
      {slotViews.map((slot) =>
        slot.isPlaceholder ? (
          <PaymentCustomColumnAddHeader key={`add-${slot.position}`} position={slot.position} />
        ) : (
          <EditablePaymentCustomFieldColumnHeader
            key={slot.fieldKey ?? slot.position}
            fieldKey={slot.fieldKey!}
            label={getDefinitionForFieldKey(slot.fieldKey!)?.label ?? slot.fieldKey!}
            position={slot.position}
          />
        )
      )}
    </>
  );
}

export function PaymentTableCustomColumnCells({
  task,
  canEdit = false,
  saving = false,
  editingFieldKey = null,
  draft = '',
  onDraftChange,
  onBeginEdit,
  onSave,
  onCancel,
}: {
  readonly task: CrmWorkflowTask;
  readonly canEdit?: boolean;
  readonly saving?: boolean;
  readonly editingFieldKey?: string | null;
  readonly draft?: string;
  readonly onDraftChange?: (value: string) => void;
  readonly onBeginEdit?: (fieldKey: string) => void;
  readonly onSave?: () => void;
  readonly onCancel?: () => void;
}): ReactElement | null {
  const { slotViews, customColumnCount, getDefinitionForFieldKey } = useBuildCorePaymentTableColumns();

  if (customColumnCount === 0) return null;

  return (
    <>
      {slotViews.map((slot) => {
        if (slot.isPlaceholder) {
          return <span key={`empty-${slot.position}`} className={styles.workflowCustomColumnCell} aria-hidden />;
        }
        const fieldKey = slot.fieldKey!;
        const fieldLabel = getDefinitionForFieldKey(fieldKey)?.label ?? fieldKey;
        const value = task.customFields?.[fieldKey] ?? null;
        const rawValue = value != null && value.trim().length > 0 ? value.trim() : null;
        const display = rawValue ?? tableCopy.emptyValue;
        const visibleValue =
          rawValue != null ? truncatePaymentTableCustomColumnText(rawValue) : display;
        const isEditing = canEdit && editingFieldKey === fieldKey;

        if (isEditing) {
          return (
            <span key={fieldKey} className={styles.workflowCustomColumnCell}>
              <input
                className={styles.inlineFieldInput}
                value={draft}
                disabled={saving}
                aria-label={fieldLabel}
                onChange={(event) => onDraftChange?.(event.target.value)}
                onBlur={() => onSave?.()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSave?.();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    onCancel?.();
                  }
                }}
                autoFocus
              />
            </span>
          );
        }

        if (canEdit) {
          return (
            <span key={fieldKey} className={styles.workflowCustomColumnCell}>
              <button
                type="button"
                className={styles.inlineCellBtn}
                disabled={saving}
                title={rawValue != null ? paymentTableCustomColumnTextTitle(rawValue) : undefined}
                aria-label={`${fieldLabel}: ${display}`}
                onClick={() => onBeginEdit?.(fieldKey)}
              >
                <span className={styles.workflowCustomColumnCellText}>{visibleValue}</span>
              </button>
            </span>
          );
        }

        return (
          <span
            key={fieldKey}
            className={styles.workflowCustomColumnCell}
            title={rawValue != null ? paymentTableCustomColumnTextTitle(rawValue) : undefined}
          >
            <span className={styles.workflowCustomColumnCellText}>{visibleValue}</span>
          </span>
        );
      })}
    </>
  );
}
