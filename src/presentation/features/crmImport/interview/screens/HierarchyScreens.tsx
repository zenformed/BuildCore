'use client';

import type { ReactElement } from 'react';
import type { CrmImportParentFieldConflict } from '@/domain/crm/spreadsheetImportGrouping';
import type { CrmImportFieldConflictResolution } from '@/domain/crm/spreadsheetImportConflictResolution';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ImportExistingParentPicker } from '@/presentation/components/CrmImport/ImportExistingParentPicker';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type HierarchyPreviewGroup = {
  readonly groupKey: string;
  readonly displayName: string;
  readonly rowCount: number;
};

export type HierarchyPreviewScreenProps = {
  readonly groups: readonly HierarchyPreviewGroup[];
};

export function HierarchyPreviewScreen({ groups }: HierarchyPreviewScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.hierarchyPreview;

  return (
    <div className={styles.wideWidth}>
      <h2 className={styles.screenHeading}>{copy.heading}</h2>
      <p className={styles.screenSubheading}>{copy.subheading}</p>
      <div className={styles.previewTableWrap}>
        <table className={styles.groupTable}>
          <thead>
            <tr>
              <th>{content.crm.spreadsheetImport.hierarchy.selectParent}</th>
              <th>{content.crm.spreadsheetImport.validate.rowsLabel}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.groupKey}>
                <td>{group.displayName}</td>
                <td>{copy.groupRowsLabel(group.rowCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type ParentResolutionDraftType = 'create_new' | 'attach_existing' | 'ignore';

export type ParentResolveScreenProps = {
  readonly groupDisplayName: string;
  readonly groupRowCount: number;
  readonly index: number;
  readonly total: number;
  readonly resolutionType: ParentResolutionDraftType;
  readonly attachProjectId: string | null;
  readonly attachLabel: string | null;
  readonly parentCandidates: readonly CrmImportParentCandidate[];
  readonly suggestedIds: readonly string[];
  readonly rowNumbersInGroup?: readonly number[];
  readonly excludedRowNumbers?: ReadonlySet<number>;
  readonly onToggleExcludeRow?: (rowNumber: number) => void;
  readonly disabled?: boolean;
  readonly onChangeType: (type: ParentResolutionDraftType) => void;
  readonly onSelectAttach: (candidate: CrmImportParentCandidate) => void;
  readonly onClearAttach: () => void;
  readonly onCreateAllUnmatched?: () => void;
  readonly onIgnoreAllUnresolved?: () => void;
};

export function ParentResolveScreen({
  groupDisplayName,
  groupRowCount,
  index,
  total,
  resolutionType,
  attachProjectId,
  attachLabel,
  parentCandidates,
  suggestedIds,
  rowNumbersInGroup = [],
  excludedRowNumbers,
  onToggleExcludeRow,
  disabled,
  onChangeType,
  onSelectAttach,
  onClearAttach,
  onCreateAllUnmatched,
  onIgnoreAllUnresolved,
}: ParentResolveScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.parentResolve;
  const hierarchy = content.crm.spreadsheetImport.hierarchy;

  return (
    <div className={styles.focusedWidth}>
      <div className={styles.stepperHeader}>
        <h2 className={styles.screenHeading} style={{ marginBottom: 0 }}>
          {copy.heading(groupDisplayName)}
        </h2>
        <span className={styles.stepperCount}>{copy.groupOfLabel(index + 1, total)}</span>
      </div>
      <p className={styles.screenSubheading}>{hierarchy.rowCount(groupRowCount)}</p>

      {(onCreateAllUnmatched != null || onIgnoreAllUnresolved != null) && index === 0 ? (
        <div className={styles.bulkActionsRow}>
          {onCreateAllUnmatched != null ? (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={disabled}
              onClick={onCreateAllUnmatched}
            >
              {copy.createAllUnmatched}
            </button>
          ) : null}
          {onIgnoreAllUnresolved != null ? (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={disabled}
              onClick={onIgnoreAllUnresolved}
            >
              {copy.ignoreAllUnresolved}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.optionGrid}>
        <button
          type="button"
          disabled={disabled}
          className={[styles.optionCard, resolutionType === 'create_new' ? styles.optionCardSelected : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChangeType('create_new')}
        >
          <span className={styles.optionCardTitle}>{copy.createNew}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={[
            styles.optionCard,
            resolutionType === 'attach_existing' ? styles.optionCardSelected : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChangeType('attach_existing')}
        >
          <span className={styles.optionCardTitle}>{copy.attachExisting}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={[styles.optionCard, resolutionType === 'ignore' ? styles.optionCardSelected : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChangeType('ignore')}
        >
          <span className={styles.optionCardTitle}>{copy.ignoreGroup}</span>
        </button>
      </div>

      {resolutionType === 'attach_existing' ? (
        <div className={styles.questionCard}>
          <label className={styles.label}>{copy.attachLabel}</label>
          <ImportExistingParentPicker
            candidates={parentCandidates}
            suggestedIds={suggestedIds}
            selectedId={attachProjectId}
            selectedLabel={attachLabel}
            disabled={disabled}
            searchPlaceholder={hierarchy.searchParentPlaceholder}
            searchAriaLabel={hierarchy.searchParentAriaLabel}
            emptyLabel={hierarchy.searchParentEmpty}
            clearLabel={hierarchy.clearParent}
            suggestedLabel={hierarchy.suggestedBadge}
            onSelect={onSelectAttach}
            onClear={onClearAttach}
          />
        </div>
      ) : null}

      {resolutionType !== 'ignore' && rowNumbersInGroup.length > 0 && onToggleExcludeRow != null ? (
        <div className={styles.questionCard}>
          <label className={styles.label}>{copy.excludeRowsLabel}</label>
          <div className={styles.rowChipList}>
            {rowNumbersInGroup.map((rowNumber) => {
              const excluded = excludedRowNumbers?.has(rowNumber) ?? false;
              return (
                <label key={rowNumber} className={styles.excludedRowToggle}>
                  <input
                    type="checkbox"
                    checked={excluded}
                    disabled={disabled}
                    onChange={() => onToggleExcludeRow(rowNumber)}
                  />
                  <span className={styles.rowChip}>{rowNumber}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type ConflictScreenProps = {
  readonly groupDisplayName: string;
  readonly fieldLabel: string;
  readonly conflict: CrmImportParentFieldConflict;
  readonly index: number;
  readonly total: number;
  readonly resolution: CrmImportFieldConflictResolution | undefined;
  readonly disabled?: boolean;
  readonly onChooseExisting: (value: string) => void;
  readonly onEnterReplacement: (value: string) => void;
};

function formatConflictRowNumbers(indexes: readonly number[]): string {
  return indexes.map((index) => String(index + 1)).join(', ');
}

export function ConflictScreen({
  groupDisplayName,
  fieldLabel,
  conflict,
  index,
  total,
  resolution,
  disabled,
  onChooseExisting,
  onEnterReplacement,
}: ConflictScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.conflict;
  const usingReplacement = resolution?.kind === 'replacement';

  return (
    <div className={styles.focusedWidth}>
      <div className={styles.stepperHeader}>
        <h2 className={styles.screenHeading} style={{ marginBottom: 0 }}>
          {copy.heading(fieldLabel)}
        </h2>
        <span className={styles.stepperCount}>{copy.fieldOfLabel(index + 1, total)}</span>
      </div>
      <p className={styles.screenSubheading}>
        {groupDisplayName} — {copy.subheading}
      </p>

      <div className={styles.questionCard}>
        {conflict.values.map((value) => {
          const selected = resolution?.kind === 'choose_existing' && resolution.value === value.value;
          return (
            <label key={value.value} className={styles.conflictOption}>
              <input
                type="radio"
                name={`conflict-${conflict.fieldKey}`}
                checked={selected}
                disabled={disabled}
                onChange={() => onChooseExisting(value.value)}
              />
              <span>
                {value.value}
                <span className={styles.conflictOptionRows}>
                  {' '}
                  — {copy.rowsLabel(formatConflictRowNumbers(value.sourceRowIndexes))}
                </span>
              </span>
            </label>
          );
        })}
        <label className={styles.conflictOption}>
          <input
            type="radio"
            name={`conflict-${conflict.fieldKey}`}
            checked={usingReplacement}
            disabled={disabled}
            onChange={() => onEnterReplacement(resolution?.kind === 'replacement' ? resolution.value : '')}
          />
          <span>{copy.enterAnother}</span>
        </label>
        {usingReplacement ? (
          <input
            className={`${styles.select} ${styles.conflictReplacementInput}`}
            value={resolution?.value ?? ''}
            disabled={disabled}
            onChange={(event) => onEnterReplacement(event.target.value)}
          />
        ) : null}
        {resolution == null || resolution.value.trim() === '' ? (
          <p className={styles.conflictUnresolved}>{copy.unresolved}</p>
        ) : null}
      </div>
    </div>
  );
}
