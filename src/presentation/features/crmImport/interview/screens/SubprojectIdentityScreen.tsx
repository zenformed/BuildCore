'use client';

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { LuCheck, LuInfo, LuPanelsTopLeft } from 'react-icons/lu';
import {
  CRM_IMPORT_NAME_SEPARATORS,
  isCompositionConfigured,
  type CrmImportColumnComposition,
  type CrmImportNameSeparator,
} from '@/domain/crm/spreadsheetImportComposition';
import { analyzeSubprojectIdentitySelection } from '@/domain/crm/spreadsheetImportSubprojectIdentityGuidance';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildSubprojectIdentityLiveExamples,
  buildSubprojectIdentityPrimaryPreview,
  buildSubprojectIdentityGuidanceView,
  moveSubprojectIdentityListRow,
  shouldShowSubprojectIdentityCombineControl,
  subprojectIdentityColumnRowClass,
  toggleSubprojectIdentityColumn,
} from '@/presentation/features/crmImport/interview/subprojectIdentityPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

const DEFAULT_SEPARATOR: CrmImportNameSeparator = ' ';

export type SampleHierarchyGroup = {
  readonly parentLabel: string;
  readonly childLabels: readonly string[];
};

export type SubprojectIdentityScreenProps = {
  readonly headers: readonly string[];
  readonly sampleRows: readonly (readonly string[])[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
  readonly disabledIndexes?: ReadonlySet<number>;
  readonly disabled?: boolean;
  readonly showSampleHierarchy?: boolean;
  readonly sampleHierarchy?: readonly SampleHierarchyGroup[];
  readonly onChange: (composition: CrmImportColumnComposition) => void;
};

export function SubprojectIdentityScreen({
  headers,
  sampleRows,
  dataRows,
  composition,
  disabledIndexes,
  disabled = false,
  showSampleHierarchy = false,
  sampleHierarchy = [],
  onChange,
}: SubprojectIdentityScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.subprojectIdentity;
  const rootId = useId();

  const selectedIndexes = composition?.columnIndexes ?? [];
  const separator = composition?.separator ?? DEFAULT_SEPARATOR;
  const selectedSet = new Set(selectedIndexes);
  const hasSelection = isCompositionConfigured(composition);
  const showCombine = shouldShowSubprojectIdentityCombineControl(selectedIndexes.length);

  const [listOrder, setListOrder] = useState<readonly number[]>(() =>
    headers.map((_, index) => index)
  );

  useEffect(() => {
    setListOrder((current) => {
      if (
        current.length === headers.length &&
        headers.every((_, index) => current.includes(index))
      ) {
        return current;
      }
      return headers.map((_, index) => index);
    });
  }, [headers]);

  const primaryPreview = useMemo(
    () => buildSubprojectIdentityPrimaryPreview(sampleRows, composition),
    [sampleRows, composition]
  );

  const liveExamples = useMemo(
    () => buildSubprojectIdentityLiveExamples({ dataRows, composition }),
    [dataRows, composition]
  );

  const guidance = useMemo(
    () =>
      analyzeSubprojectIdentitySelection({
        headers,
        dataRows,
        composition,
      }),
    [headers, dataRows, composition]
  );

  const guidanceView = useMemo(
    () => buildSubprojectIdentityGuidanceView(guidance, copy),
    [guidance, copy]
  );

  const commit = (columnIndexes: readonly number[], nextSeparator = separator) => {
    onChange({ columnIndexes, separator: nextSeparator });
  };

  const toggle = (index: number) => {
    if (disabled || disabledIndexes?.has(index)) return;
    commit(toggleSubprojectIdentityColumn(selectedIndexes, index));
  };

  const reorder = (index: number, direction: -1 | 1) => {
    if (disabled || !selectedSet.has(index)) return;
    const next = moveSubprojectIdentityListRow({
      listOrder,
      selectedIndexes,
      index,
      direction,
    });
    setListOrder(next.listOrder);
    commit(next.selectedIndexes);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (disabled || disabledIndexes?.has(index)) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(index);
      return;
    }
    if (!selectedSet.has(index)) return;
    if (event.key === 'ArrowUp' && (event.altKey || event.metaKey)) {
      event.preventDefault();
      reorder(index, -1);
    } else if (event.key === 'ArrowDown' && (event.altKey || event.metaKey)) {
      event.preventDefault();
      reorder(index, 1);
    }
  };

  const visibleIndexes = listOrder.filter((index) => index >= 0 && index < headers.length);

  return (
    <div className={styles.subprojectIdentityScreen}>
      <div className={styles.subprojectIdentityIntro}>
        <span className={styles.subprojectIdentityIntroIcon} aria-hidden>
          <LuPanelsTopLeft size={20} />
        </span>
        <div>
          <h2 className={styles.subprojectIdentityHeading}>{copy.heading}</h2>
          <p className={styles.subprojectIdentitySubheading}>{copy.subheading}</p>
        </div>
      </div>

      <div className={styles.subprojectIdentityPanels}>
        <section
          className={styles.subprojectIdentityPanel}
          aria-labelledby={`${rootId}-left`}
        >
          <div className={styles.subprojectIdentityPanelHeader}>
            <h3 id={`${rootId}-left`} className={styles.subprojectIdentityPanelTitle}>
              {copy.selectTitle}
            </h3>
            <p className={styles.subprojectIdentityPanelBody}>{copy.selectBody}</p>
          </div>

          <div
            className={styles.subprojectIdentityColumnList}
            role="group"
            aria-label={copy.selectTitle}
          >
            {visibleIndexes.map((index) => {
              const header = headers[index] ?? `Column ${index + 1}`;
              const isSelected = selectedSet.has(index);
              const isDisabled = disabled || (disabledIndexes?.has(index) ?? false);
              const order = isSelected ? selectedIndexes.indexOf(index) + 1 : null;
              const sample =
                sampleRows.find((row) => (row[index] ?? '').trim() !== '')?.[index] ?? '';
              return (
                <div
                  key={`${header}-${index}`}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-disabled={isDisabled}
                  aria-label={
                    order != null
                      ? copy.rowAriaLabelOrdered(header, order)
                      : copy.rowAriaLabel(header)
                  }
                  tabIndex={isDisabled ? -1 : 0}
                  className={subprojectIdentityColumnRowClass({
                    selected: isSelected,
                    disabled: isDisabled,
                    styles: {
                      row: styles.subprojectIdentityColumnRow,
                      selected: styles.subprojectIdentityColumnRowSelected,
                      disabled: styles.subprojectIdentityColumnRowDisabled,
                    },
                  })}
                  onClick={() => toggle(index)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                >
                  <span className={styles.subprojectIdentityCheckboxFace} aria-hidden>
                    {isSelected ? <LuCheck size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className={styles.subprojectIdentityColumnName}>{header}</span>
                  {order != null ? (
                    <span className={styles.subprojectIdentityOrderBadge} aria-hidden>
                      {order}
                    </span>
                  ) : null}
                  {sample ? (
                    <span className={styles.subprojectIdentityColumnSample} title={sample}>
                      {sample}
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className={styles.subprojectIdentityReorderGroup}>
                      <button
                        type="button"
                        className={styles.subprojectIdentityReorderButton}
                        disabled={disabled || visibleIndexes.indexOf(index) <= 0}
                        aria-label={copy.moveEarlierAria(header)}
                        onClick={(event) => {
                          event.stopPropagation();
                          reorder(index, -1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.subprojectIdentityReorderButton}
                        disabled={
                          disabled || visibleIndexes.indexOf(index) >= visibleIndexes.length - 1
                        }
                        aria-label={copy.moveLaterAria(header)}
                        onClick={(event) => {
                          event.stopPropagation();
                          reorder(index, 1);
                        }}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className={styles.subprojectIdentityTip}>
            <LuInfo className={styles.subprojectIdentityTipIcon} size={16} aria-hidden />
            <p className={styles.subprojectIdentityTipText}>{copy.reorderTip}</p>
          </div>
        </section>

        <section
          className={styles.subprojectIdentityPanel}
          aria-labelledby={`${rootId}-right`}
        >
          <div className={styles.subprojectIdentityPanelHeader}>
            <h3 id={`${rootId}-right`} className={styles.subprojectIdentityPanelTitle}>
              {copy.joinTitle}
            </h3>
            <p className={styles.subprojectIdentityPanelBody}>{copy.joinBody}</p>
          </div>

          {showCombine ? (
            <div className={styles.subprojectIdentityCombine}>
              <label className={styles.subprojectIdentityCombineLabel} htmlFor={`${rootId}-sep`}>
                {copy.combineLabel}
              </label>
              <select
                id={`${rootId}-sep`}
                className={styles.subprojectIdentityCombineSelect}
                value={separator}
                disabled={disabled}
                onChange={(event) =>
                  commit(selectedIndexes, event.target.value as CrmImportNameSeparator)
                }
              >
                {CRM_IMPORT_NAME_SEPARATORS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : hasSelection ? (
            <p className={styles.subprojectIdentityCombineHint}>{copy.oneColumnHint}</p>
          ) : (
            <p className={styles.subprojectIdentityCombineHint}>{copy.selectToCombineHint}</p>
          )}

          <div className={styles.subprojectIdentityPreviewBlock}>
            <p className={styles.subprojectIdentityPreviewLabel}>{copy.previewLabel}</p>
            <div
              className={styles.subprojectIdentityPreviewBox}
              aria-live="polite"
              aria-atomic="true"
              aria-label={copy.previewLiveRegionLabel}
            >
              {primaryPreview ? (
                <p className={styles.subprojectIdentityPreviewName}>{primaryPreview}</p>
              ) : (
                <p className={styles.subprojectIdentityPreviewEmpty}>{copy.previewEmpty}</p>
              )}
            </div>
            <p className={styles.subprojectIdentityPreviewHint}>{copy.previewHint}</p>
          </div>

          {guidanceView != null ? (
            <div
              className={[
                styles.subprojectIdentityGuidance,
                guidanceView.tone === 'success'
                  ? styles.subprojectIdentityGuidanceSuccess
                  : styles.subprojectIdentityGuidanceWarning,
              ].join(' ')}
              role="status"
              aria-live="polite"
            >
              <p className={styles.subprojectIdentityGuidanceTitle}>{guidanceView.title}</p>
              {guidanceView.body ? (
                <p className={styles.subprojectIdentityGuidanceBody}>{guidanceView.body}</p>
              ) : null}
            </div>
          ) : null}

          <div className={styles.subprojectIdentityWhy}>
            <p className={styles.subprojectIdentityWhyTitle}>{copy.whyTitle}</p>
            <p className={styles.subprojectIdentityWhyBody}>{copy.whyBody}</p>
            <p className={styles.subprojectIdentityWhyBody}>{copy.whyBodySecondary}</p>
          </div>
        </section>
      </div>

      <section
        className={styles.subprojectIdentityLiveExamples}
        aria-labelledby={`${rootId}-examples`}
      >
        <div className={styles.subprojectIdentityLiveExamplesCopy}>
          <p id={`${rootId}-examples`} className={styles.subprojectIdentityLiveExamplesLabel}>
            {copy.liveExamplesLabel}
          </p>
          <p className={styles.subprojectIdentityLiveExamplesBody}>{copy.liveExamplesBody}</p>
        </div>
        <div
          className={styles.subprojectIdentityLiveExamplesChips}
          aria-live="polite"
          aria-atomic="false"
        >
          {hasSelection && liveExamples.examples.length > 0 ? (
            <>
              {liveExamples.examples.map((example) => (
                <span key={example} className={styles.subprojectIdentityExampleChip}>
                  {example}
                </span>
              ))}
              {liveExamples.remainingCount > 0 ? (
                <span className={styles.subprojectIdentityExampleChipMore}>
                  {copy.moreExamples(liveExamples.remainingCount)}
                </span>
              ) : null}
            </>
          ) : (
            <p className={styles.subprojectIdentityLiveExamplesEmpty}>{copy.liveExamplesEmpty}</p>
          )}
        </div>
      </section>

      {showSampleHierarchy && sampleHierarchy.length > 0 ? (
        <div className={styles.subprojectIdentityHierarchy}>
          <p className={styles.subprojectIdentityHierarchyTitle}>{copy.sampleHierarchyLabel}</p>
          <ul className={styles.subprojectIdentityHierarchyList}>
            {sampleHierarchy.slice(0, 4).map((group) => (
              <li key={group.parentLabel}>
                <strong>{group.parentLabel}</strong>
                {group.childLabels.length > 0 ? (
                  <> — {group.childLabels.slice(0, 3).join(', ')}</>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
