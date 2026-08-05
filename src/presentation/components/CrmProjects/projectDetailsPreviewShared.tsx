'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';

export const PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH = 55;

export function truncatePreviewCustomFieldValue(value: string): string {
  if (value.length <= PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH) return value;
  return `${value.slice(0, PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH)}…`;
}

export function previewCustomFieldValueTitle(
  value: string,
  emptyValue: string
): string | undefined {
  if (value === emptyValue || value.length <= PREVIEW_CUSTOM_FIELD_VALUE_MAX_LENGTH) return undefined;
  return value;
}

export function PreviewMetaColumn({
  label,
  value,
  align = 'start',
  labelPosition = 'below',
  leadingIcon = null,
  leadingIconMode = 'default',
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly align?: 'start' | 'center' | 'end';
  readonly labelPosition?: 'above' | 'below';
  readonly leadingIcon?: ReactNode;
  readonly leadingIconMode?: 'default' | 'inline_only_mobile';
}): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const showColumnIcon = leadingIcon != null && !(isMobileLayout && leadingIconMode === 'inline_only_mobile');
  const columnClass = [
    cardStyles.metaColumn,
    align === 'center' ? cardStyles.metaColumn_center : '',
    align === 'end' ? cardStyles.metaColumn_end : '',
    labelPosition === 'above' ? cardStyles.metaColumn_labelsFirst : '',
    leadingIcon != null ? cardStyles.metaColumn_withIcon : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelEl = <div className={cardStyles.metaLabel}>{label}</div>;
  const valueEl = <div className={cardStyles.metaValue}>{value}</div>;
  const mobileValueWithIconEl =
    leadingIcon != null ? (
      <div className={cardStyles.metaValueWithInlineIconRow}>
        <span className={cardStyles.metaValueInlineIcon} aria-hidden>
          {leadingIcon}
        </span>
        <div className={cardStyles.metaValueWithInlineIconContent}>{value}</div>
      </div>
    ) : valueEl;

  const columnContent =
    labelPosition === 'above' ? (
      <>
        {labelEl}
        {isMobileLayout ? mobileValueWithIconEl : valueEl}
      </>
    ) : (
      <>
        {isMobileLayout ? mobileValueWithIconEl : valueEl}
        {labelEl}
      </>
    );

  if (leadingIcon == null) {
    return <div className={columnClass}>{columnContent}</div>;
  }

  if (!showColumnIcon) {
    return <div className={columnClass}>{columnContent}</div>;
  }

  return (
    <div className={columnClass}>
      <span className={cardStyles.metaColumnIcon} aria-hidden>
        {leadingIcon}
      </span>
      <div className={cardStyles.metaColumnContent}>{columnContent}</div>
    </div>
  );
}

export function formatMetaList(values: readonly string[], emptyValue: string): string {
  if (values.length === 0) return emptyValue;
  return values.join('\n');
}

export function StackedMetaList({
  values,
  emptyValue,
}: {
  readonly values: readonly string[];
  readonly emptyValue: string;
}): ReactElement {
  if (values.length === 0) {
    return <span className={cardStyles.metaValue}>{emptyValue}</span>;
  }

  return (
    <div className={cardStyles.metaStackedList}>
      {values.map((value, index) => (
        <span key={`${value}-${index}`} className={cardStyles.metaStackedListItem}>
          {value}
        </span>
      ))}
    </div>
  );
}

export function PreviewMetaInlineField({
  label,
  value,
  displayValue,
  disabled = false,
  isSaving = false,
  inputType = 'text',
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly displayValue?: string;
  readonly disabled?: boolean;
  readonly isSaving?: boolean;
  readonly inputType?: 'text' | 'email' | 'tel';
  readonly onSave: (next: string) => Promise<void>;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayText = (displayValue ?? value) || '—';

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const save = useCallback(async () => {
    setEditing(false);
    if (draft.trim() === value.trim()) {
      setDraft(value);
      return;
    }
    await onSave(draft);
  }, [draft, onSave, value]);

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

  return (
    <div
      className={`${cardStyles.previewMetaInlineSlot}${isSaving ? ` ${cardStyles.previewMetaInline_saving}` : ''}`}
      role="group"
      aria-label={label}
      aria-busy={isSaving || undefined}
    >
      <span className={cardStyles.previewMetaInlineGhost} aria-hidden>
        {displayText}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type={inputType}
          className={cardStyles.previewMetaInlineInput}
          value={draft}
          disabled={disabled || isSaving}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save()}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button
          type="button"
          className={cardStyles.previewMetaInlineBtn}
          disabled={disabled || isSaving}
          onClick={() => setEditing(true)}
        >
          {displayText}
        </button>
      )}
    </div>
  );
}

export function PreviewMetaNotesField({
  label,
  value,
  disabled = false,
  isSaving = false,
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly isSaving?: boolean;
  readonly onSave: (next: string) => Promise<void>;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayText = value.trim() || 'Add notes…';

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const save = useCallback(async () => {
    setEditing(false);
    if (draft.trim() === value.trim()) {
      setDraft(value);
      return;
    }
    await onSave(draft);
  }, [draft, onSave, value]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void save();
      }
    },
    [cancel, save]
  );

  return (
    <div role="group" aria-label={label} aria-busy={isSaving || undefined}>
      {editing ? (
        <textarea
          ref={textareaRef}
          className={cardStyles.previewNotesInput}
          value={draft}
          disabled={disabled || isSaving}
          aria-label={label}
          rows={4}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save()}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button
          type="button"
          className={`${cardStyles.previewNotesBtn}${isSaving ? ` ${cardStyles.previewMetaInline_saving}` : ''}`}
          disabled={disabled || isSaving}
          onClick={() => setEditing(true)}
        >
          {displayText}
        </button>
      )}
    </div>
  );
}

export function PreviewMetaCustomFieldValue({
  label,
  value,
  emptyValue,
  disabled = false,
  isSaving = false,
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly emptyValue: string;
  readonly disabled?: boolean;
  readonly isSaving?: boolean;
  readonly onSave: (next: string) => Promise<void>;
}): ReactElement {
  const isEmpty = value.trim().length === 0;
  const displayValue = isEmpty ? emptyValue : truncatePreviewCustomFieldValue(value.trim());

  return (
    <PreviewMetaInlineField
      label={label}
      value={value}
      displayValue={displayValue}
      disabled={disabled}
      isSaving={isSaving}
      onSave={onSave}
    />
  );
}
