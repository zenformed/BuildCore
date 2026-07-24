'use client';

import type { ReactElement } from 'react';
import {
  CRM_IMPORT_NAME_SEPARATORS,
  composeImportNameExample,
  type CrmImportColumnComposition,
  type CrmImportNameSeparator,
} from '@/domain/crm/spreadsheetImportComposition';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type CompositionBuilderProps = {
  readonly headers: readonly string[];
  readonly sampleRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
  /** Columns already used elsewhere (e.g. by another identity composition) — shown disabled. */
  readonly disabledIndexes?: ReadonlySet<number>;
  readonly disabled?: boolean;
  readonly onChange: (composition: CrmImportColumnComposition) => void;
};

const DEFAULT_SEPARATOR: CrmImportNameSeparator = ' ';

export function CompositionBuilder({
  headers,
  sampleRows,
  composition,
  disabledIndexes,
  disabled = false,
  onChange,
}: CompositionBuilderProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.composition;
  const selectedIndexes = composition?.columnIndexes ?? [];
  const separator = composition?.separator ?? DEFAULT_SEPARATOR;
  const selectedSet = new Set(selectedIndexes);

  const toggle = (index: number) => {
    if (disabled || disabledIndexes?.has(index)) return;
    const next = selectedSet.has(index)
      ? selectedIndexes.filter((i) => i !== index)
      : [...selectedIndexes, index];
    onChange({ columnIndexes: next, separator });
  };

  const reorder = (index: number, direction: -1 | 1) => {
    const position = selectedIndexes.indexOf(index);
    if (position < 0) return;
    const target = position + direction;
    if (target < 0 || target >= selectedIndexes.length) return;
    const next = [...selectedIndexes];
    const tmp = next[position]!;
    next[position] = next[target]!;
    next[target] = tmp;
    onChange({ columnIndexes: next, separator });
  };

  const examples =
    selectedIndexes.length > 0
      ? composeImportNameExample(sampleRows, { columnIndexes: selectedIndexes, separator }, 3)
      : [];

  return (
    <div className={styles.compositionBuilder}>
      <p className={styles.compositionEmptyHint}>{copy.selectColumnsHint}</p>
      <div className={styles.compositionColumnList} role="group">
        {headers.map((header, index) => {
          const isSelected = selectedSet.has(index);
          const isDisabled = disabled || (disabledIndexes?.has(index) ?? false);
          const order = isSelected ? selectedIndexes.indexOf(index) + 1 : null;
          const sample = sampleRows.find((row) => (row[index] ?? '').trim() !== '')?.[index] ?? '';
          return (
            <label
              key={`${header}-${index}`}
              className={[
                styles.compositionColumnItem,
                isSelected ? styles.compositionColumnItemSelected : '',
                isDisabled ? styles.compositionColumnItemDisabled : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(index)}
              />
              {order != null ? (
                <span className={styles.compositionOrderBadge}>{order}</span>
              ) : null}
              <span className={styles.compositionColumnHeaderText}>{header}</span>
              {sample ? (
                <span className={styles.compositionColumnSample} title={sample}>
                  {sample}
                </span>
              ) : null}
              {isSelected ? (
                <span className={styles.compositionReorderGroup}>
                  <button
                    type="button"
                    className={styles.compositionReorderButton}
                    disabled={disabled || order === 1}
                    onClick={(event) => {
                      event.preventDefault();
                      reorder(index, -1);
                    }}
                    aria-label="Move earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.compositionReorderButton}
                    disabled={disabled || order === selectedIndexes.length}
                    onClick={(event) => {
                      event.preventDefault();
                      reorder(index, 1);
                    }}
                    aria-label="Move later"
                  >
                    ↓
                  </button>
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      <div className={styles.compositionSeparatorRow}>
        <label className={styles.label} htmlFor="composition-separator">
          {copy.separatorLabel}
        </label>
        <select
          id="composition-separator"
          className={styles.select}
          value={separator}
          disabled={disabled || selectedIndexes.length < 2}
          onChange={(event) =>
            onChange({
              columnIndexes: selectedIndexes,
              separator: event.target.value as CrmImportNameSeparator,
            })
          }
        >
          {CRM_IMPORT_NAME_SEPARATORS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.compositionExamplesBox}>
        <p className={styles.compositionExamplesLabel}>{copy.examplesLabel}</p>
        {examples.length > 0 ? (
          examples.map((example) => (
            <p key={example} className={styles.compositionExampleItem}>
              {example}
            </p>
          ))
        ) : (
          <p className={styles.compositionEmptyHint}>{copy.emptyHint}</p>
        )}
      </div>
    </div>
  );
}
