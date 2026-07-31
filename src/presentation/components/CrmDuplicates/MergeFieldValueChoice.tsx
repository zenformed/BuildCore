'use client';

import type { ReactElement, ReactNode } from 'react';
import { LuCheck } from 'react-icons/lu';
import type {
  DuplicateResolveRecordAction,
  MergeFieldMultiConflict,
  MergeFieldSingleConflict,
  MergeFieldState,
  MergeValueSide,
} from '@/domain/crm/identity';
import {
  mergeFieldSelectionEnabled,
  selectSingleMergeSide,
  toggleMultiMergeSide,
} from '@/domain/crm/identity';
import styles from './MergeFieldValueChoice.module.css';

export type MergeFieldValueChoiceCopy = {
  readonly incomingSideLabel: string;
  readonly existingSideLabel: string;
  readonly keepValueAria: (sideLabel: string, value: string) => string;
  readonly matchedFieldMark: string;
  readonly actionImportNew: string;
  readonly actionUpdateExisting: string;
  readonly actionSkip: string;
  readonly actionLegend: string;
  readonly fieldsDisabledHint: string;
};

export type MergeFieldValueChoiceProps = {
  readonly sideLabel: string;
  readonly value: string;
  /** When true, this value is kept / selected. */
  readonly selected: boolean;
  /** When false, show match indicator only (identical values). */
  readonly selectable: boolean;
  readonly disabled?: boolean;
  readonly matched?: boolean;
  readonly matchedMarkLabel?: string;
  readonly onSelect?: () => void;
  readonly keepAriaLabel: string;
  /** Optional extra content after the value (e.g. stage pill). */
  readonly trailing?: ReactNode;
};

/**
 * One side of a keep-value choice: value text + check control after it.
 * Selected = normal + check. Unselected (when selectable) = muted + strikethrough.
 */
export function MergeFieldValueChoice({
  sideLabel,
  value,
  selected,
  selectable,
  disabled = false,
  matched = false,
  matchedMarkLabel,
  onSelect,
  keepAriaLabel,
  trailing,
}: MergeFieldValueChoiceProps): ReactElement {
  const display = value.trim() ? value : '—';
  const isEmpty = !value.trim();

  if (!selectable || matched) {
    return (
      <div className={styles.sideRow}>
        <span className={styles.sideLabel}>{sideLabel}</span>
        <div className={styles.valueWrap}>
          <span className={matched && !isEmpty ? styles.valueMatched : styles.valueText}>
            <span className={isEmpty ? styles.valueEmpty : undefined}>{display}</span>
            {matched && !isEmpty ? (
              <span
                className={styles.matchMark}
                aria-label={matchedMarkLabel}
                title={matchedMarkLabel}
              >
                !
              </span>
            ) : null}
          </span>
          {trailing}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sideRow}>
      <span className={styles.sideLabel}>{sideLabel}</span>
      <div className={styles.valueWrap}>
        <button
          type="button"
          className={[
            styles.valueButton,
            selected ? styles.valueButtonSelected : styles.valueButtonRejected,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={selected}
          aria-label={keepAriaLabel}
          disabled={disabled}
          onClick={onSelect}
        >
          <span
            className={[
              styles.valueText,
              selected ? styles.valueSelected : styles.valueRejected,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {display}
          </span>
          <span
            className={[styles.checkMark, selected ? styles.checkMarkOn : styles.checkMarkOff]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          >
            <LuCheck size={12} strokeWidth={3} />
          </span>
        </button>
        {trailing}
      </div>
    </div>
  );
}

export type MergeFieldRowProps = {
  readonly field: MergeFieldState;
  readonly copy: MergeFieldValueChoiceCopy;
  readonly disabled?: boolean;
  readonly selectionEnabled: boolean;
  readonly onChange: (next: MergeFieldState) => void;
};

function formatMultiDisplay(values: readonly string[]): string {
  return values.join(', ');
}

export function MergeFieldRow({
  field,
  copy,
  disabled = false,
  selectionEnabled,
  onChange,
}: MergeFieldRowProps): ReactElement {
  if (field.kind === 'identical') {
    return (
      <div className={styles.fieldBlock}>
        <p className={styles.fieldLabel}>{field.label}</p>
        <div className={styles.valueWrap}>
          <span className={styles.valueMatched}>
            <span>{field.value}</span>
            <span
              className={styles.matchMark}
              aria-label={copy.matchedFieldMark}
              title={copy.matchedFieldMark}
            >
              !
            </span>
          </span>
        </div>
      </div>
    );
  }

  const interactive = selectionEnabled && !disabled;

  if (field.cardinality === 'single') {
    return (
      <div className={styles.fieldBlock}>
        <p className={styles.fieldLabel}>{field.label}</p>
        <div className={styles.sides}>
          <MergeFieldValueChoice
            sideLabel={copy.incomingSideLabel}
            value={field.incomingValue}
            selected={field.selected === 'incoming'}
            selectable={interactive}
            disabled={!interactive}
            onSelect={() => onChange(selectSingleMergeSide(field, 'incoming'))}
            keepAriaLabel={copy.keepValueAria(copy.incomingSideLabel, field.incomingValue)}
          />
          <MergeFieldValueChoice
            sideLabel={copy.existingSideLabel}
            value={field.existingValue}
            selected={field.selected === 'existing'}
            selectable={interactive}
            disabled={!interactive}
            onSelect={() => onChange(selectSingleMergeSide(field, 'existing'))}
            keepAriaLabel={copy.keepValueAria(copy.existingSideLabel, field.existingValue)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fieldBlock}>
      <p className={styles.fieldLabel}>{field.label}</p>
      <div className={styles.sides}>
        <MergeFieldValueChoice
          sideLabel={copy.incomingSideLabel}
          value={formatMultiDisplay(field.incomingValues)}
          selected={field.keepIncoming}
          selectable={interactive}
          disabled={!interactive}
          onSelect={() => onChange(toggleMultiMergeSide(field, 'incoming'))}
          keepAriaLabel={copy.keepValueAria(
            copy.incomingSideLabel,
            formatMultiDisplay(field.incomingValues)
          )}
        />
        <MergeFieldValueChoice
          sideLabel={copy.existingSideLabel}
          value={formatMultiDisplay(field.existingValues)}
          selected={field.keepExisting}
          selectable={interactive}
          disabled={!interactive}
          onSelect={() => onChange(toggleMultiMergeSide(field, 'existing'))}
          keepAriaLabel={copy.keepValueAria(
            copy.existingSideLabel,
            formatMultiDisplay(field.existingValues)
          )}
        />
      </div>
    </div>
  );
}

export type DuplicateResolveRecordActionsProps = {
  readonly action: DuplicateResolveRecordAction | null;
  readonly copy: MergeFieldValueChoiceCopy;
  readonly disabled?: boolean;
  readonly onChange: (action: DuplicateResolveRecordAction) => void;
};

/** Record-level Import / Update / Skip. Field picks apply only when Update is selected. */
export function DuplicateResolveRecordActions({
  action,
  copy,
  disabled = false,
  onChange,
}: DuplicateResolveRecordActionsProps): ReactElement {
  const options: { readonly id: DuplicateResolveRecordAction; readonly label: string }[] = [
    { id: 'import_new', label: copy.actionImportNew },
    { id: 'update_existing', label: copy.actionUpdateExisting },
    { id: 'skip', label: copy.actionSkip },
  ];

  return (
    <fieldset className={styles.recordActions} disabled={disabled}>
      <legend className={styles.srOnly}>{copy.actionLegend}</legend>
      {options.map((option) => {
        const selected = action === option.id;
        return (
          <label
            key={option.id}
            className={[styles.recordOption, selected ? styles.recordOptionSelected : '']
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="duplicate-resolve-record-action"
              checked={selected}
              onChange={() => onChange(option.id)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

export type MergeFieldSelectionPanelProps = {
  readonly fields: readonly MergeFieldState[];
  readonly recordAction: DuplicateResolveRecordAction | null;
  readonly copy: MergeFieldValueChoiceCopy;
  readonly disabled?: boolean;
  readonly onRecordActionChange: (action: DuplicateResolveRecordAction) => void;
  readonly onFieldsChange: (fields: MergeFieldState[]) => void;
};

/**
 * Reusable keep-value merge panel foundation.
 * Field selection is interactive only when record action is Update Existing.
 */
export function MergeFieldSelectionPanel({
  fields,
  recordAction,
  copy,
  disabled = false,
  onRecordActionChange,
  onFieldsChange,
}: MergeFieldSelectionPanelProps): ReactElement {
  const selectionEnabled = mergeFieldSelectionEnabled(recordAction);

  const updateField = (next: MergeFieldState) => {
    onFieldsChange(fields.map((field) => (field.fieldKey === next.fieldKey ? next : field)));
  };

  return (
    <div className={styles.panel}>
      <DuplicateResolveRecordActions
        action={recordAction}
        copy={copy}
        disabled={disabled}
        onChange={onRecordActionChange}
      />
      {!selectionEnabled && recordAction != null && recordAction !== 'update_existing' ? (
        <p className={styles.disabledHint}>{copy.fieldsDisabledHint}</p>
      ) : null}
      <div
        className={[styles.fieldList, selectionEnabled ? '' : styles.fieldListInactive]
          .filter(Boolean)
          .join(' ')}
        aria-disabled={!selectionEnabled}
      >
        {fields.map((field) => (
          <MergeFieldRow
            key={field.fieldKey}
            field={field}
            copy={copy}
            disabled={disabled}
            selectionEnabled={selectionEnabled}
            onChange={updateField}
          />
        ))}
      </div>
    </div>
  );
}

/** @internal helpers exported for tests / demos */
export function isSingleConflict(field: MergeFieldState): field is MergeFieldSingleConflict {
  return field.kind === 'conflict' && field.cardinality === 'single';
}

export function isMultiConflict(field: MergeFieldState): field is MergeFieldMultiConflict {
  return field.kind === 'conflict' && field.cardinality === 'multi';
}

export type { MergeValueSide };
