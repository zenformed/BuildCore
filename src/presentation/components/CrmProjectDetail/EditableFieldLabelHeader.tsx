'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import {
  BUILDCORE_FIELD_LABEL_MAX_LENGTH,
  getBuildCoreFieldLabelRegistryEntry,
  type RegisteredBuildCoreFieldKey,
} from '@/domain/buildcore/fieldLabels';
import {
  getFieldMeaning,
  type BuildCoreFieldLabelContext,
} from '@/domain/buildcore/fieldLabelMeanings';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCoreFieldLabels } from '@/presentation/providers/BuildCoreFieldLabelsProvider';
import styles from './ProjectDetail.module.css';

export type EditableFieldLabelHeaderAlign = 'center' | 'start';

export type EditableFieldLabelHeaderProps = {
  readonly fieldKey: RegisteredBuildCoreFieldKey;
  readonly context?: BuildCoreFieldLabelContext;
  readonly align?: EditableFieldLabelHeaderAlign;
  readonly className?: string;
};

function headerAlignClass(align: EditableFieldLabelHeaderAlign): string {
  return align === 'center'
    ? styles.workflowColumnHeaderAlignCenter
    : styles.workflowColumnHeaderAlignStart;
}

export function EditableFieldLabelHeader({
  fieldKey,
  context = 'workflow',
  align = 'start',
  className,
}: EditableFieldLabelHeaderProps): ReactElement {
  const entry = getBuildCoreFieldLabelRegistryEntry(fieldKey);
  const editable = entry?.editable === true;
  const { getFieldLabel, updateFieldLabel, canEditFieldLabels, isSaving } =
    useBuildCoreFieldLabels();
  const { setToast } = useProjectDetailShell();
  const displayLabel = getFieldLabel(fieldKey);
  const meaningLabel = getFieldMeaning(fieldKey, context) ?? displayLabel;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingThisField = isSaving && editing;
  const canEdit = editable && canEditFieldLabels;
  const alignClass = headerAlignClass(align);
  const wrapperClass = [alignClass, className].filter(Boolean).join(' ');

  useEffect(() => {
    if (!editing) setDraft(displayLabel);
  }, [displayLabel, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(displayLabel);
    setEditing(false);
  }, [displayLabel]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed) {
      setDraft(displayLabel);
      setToast({ kind: 'error', message: 'Label is required.' });
      return;
    }
    if (trimmed === displayLabel.trim()) {
      setDraft(displayLabel);
      return;
    }
    const ok = await updateFieldLabel(fieldKey, trimmed);
    if (!ok) {
      setDraft(displayLabel);
      setToast({ kind: 'error', message: 'Could not save field label.' });
    }
  }, [displayLabel, draft, fieldKey, setToast, updateFieldLabel]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void save();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    },
    [cancel, save]
  );

  if (editing && canEdit) {
    return (
      <span
        role="columnheader"
        className={`${styles.workflowColumnHeaderEditable} ${wrapperClass}`.trim()}
        aria-busy={savingThisField || undefined}
        title={meaningLabel}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.workflowColumnHeaderInput}
          value={draft}
          maxLength={BUILDCORE_FIELD_LABEL_MAX_LENGTH}
          disabled={savingThisField}
          aria-label={displayLabel}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save()}
          onKeyDown={onKeyDown}
        />
      </span>
    );
  }

  if (canEdit) {
    return (
      <button
        type="button"
        role="columnheader"
        className={`${styles.workflowColumnHeaderLabelBtn} ${savingThisField ? styles.workflowColumnHeaderLabelBtn_saving : ''} ${wrapperClass}`.trim()}
        aria-label={`${displayLabel}. ${meaningLabel}. Click to rename column.`}
        title={meaningLabel}
        disabled={savingThisField}
        onClick={() => {
          setDraft(displayLabel);
          setEditing(true);
        }}
      >
        <span className={styles.workflowColumnHeaderLabelText}>{displayLabel}</span>
      </button>
    );
  }

  return (
    <span
      role="columnheader"
      className={`${styles.workflowColumnHeaderLabelStatic} ${wrapperClass}`.trim()}
      aria-label={`${displayLabel}. ${meaningLabel}.`}
      title={meaningLabel}
    >
      <span className={styles.workflowColumnHeaderLabelText}>{displayLabel}</span>
    </span>
  );
}

export type WorkflowFieldLabelTextProps = {
  readonly fieldKey: RegisteredBuildCoreFieldKey;
  readonly className?: string;
};

export function WorkflowFieldLabelText({
  fieldKey,
  className,
}: WorkflowFieldLabelTextProps): ReactElement {
  const { getFieldLabel } = useBuildCoreFieldLabels();
  return <span className={className}>{getFieldLabel(fieldKey)}</span>;
}

export type WorkflowTaskActionsColumnHeaderProps = {
  readonly context?: BuildCoreFieldLabelContext;
};

export function WorkflowTaskActionsColumnHeader({
  context = 'workflow',
}: WorkflowTaskActionsColumnHeaderProps): ReactElement {
  const { getFieldLabel } = useBuildCoreFieldLabels();
  const fieldKey = 'workflow_task.actions' as const;
  const displayLabel = getFieldLabel(fieldKey);
  const meaningLabel = getFieldMeaning(fieldKey, context) ?? displayLabel;

  return (
    <span
      role="columnheader"
      className={styles.taskDeleteHeader}
      aria-label={`${displayLabel}. ${meaningLabel}.`}
      title={meaningLabel}
    >
    </span>
  );
}
