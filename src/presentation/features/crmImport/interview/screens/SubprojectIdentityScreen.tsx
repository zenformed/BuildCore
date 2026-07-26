'use client';

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuInfo,
  LuLightbulb,
  LuUserRound,
} from 'react-icons/lu';
import {
  CRM_IMPORT_NAME_SEPARATORS,
  composeImportNameExample,
  isCompositionConfigured,
  type CrmImportColumnComposition,
  type CrmImportNameSeparator,
} from '@/domain/crm/spreadsheetImportComposition';
import { analyzeSubprojectIdentitySelection } from '@/domain/crm/spreadsheetImportSubprojectIdentityGuidance';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildSubprojectIdentityGroups,
  buildSubprojectIdentityGuidanceView,
  buildSubprojectIdentityPreviewGroups,
  moveSubprojectIdentityListRow,
  shouldShowSubprojectIdentityCombineControl,
  subprojectIdentityColumnRowClass,
  toggleSubprojectIdentityColumn,
} from '@/presentation/features/crmImport/interview/subprojectIdentityPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

const DEFAULT_SEPARATOR: CrmImportNameSeparator = ' ';

export type SubprojectIdentityScreenProps = {
  readonly headers: readonly string[];
  readonly sampleRows: readonly (readonly string[])[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
  readonly disabledIndexes?: ReadonlySet<number>;
  readonly disabled?: boolean;
  readonly onChange: (composition: CrmImportColumnComposition) => void;
};

/**
 * Subproject / row-name identity — same two-panel select+reorder chrome and
 * Project-style preview (sample cards, would-create callout).
 */
export function SubprojectIdentityScreen({
  headers,
  sampleRows,
  dataRows,
  composition,
  disabledIndexes,
  disabled = false,
  onChange,
}: SubprojectIdentityScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.subprojectIdentity;
  const rootId = useId();
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

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

  const primaryExample =
    hasSelection && composition != null
      ? composeImportNameExample(sampleRows, composition, 1)[0] ?? null
      : null;

  const groups = useMemo(() => {
    if (!hasSelection || composition == null) return [];
    return buildSubprojectIdentityGroups({ dataRows, composition });
  }, [hasSelection, composition, dataRows]);

  const preview = useMemo(() => {
    if (!hasSelection || composition == null) {
      return { visible: [] as const, remainingCount: 0 };
    }
    return buildSubprojectIdentityPreviewGroups({
      groups,
      headers,
      dataRows,
      composition,
    });
  }, [hasSelection, composition, groups, headers, dataRows]);

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
    <div className={styles.projectIdentityScreen}>
      <div className={styles.projectIdentityIntro}>
        <h2 className={styles.projectIdentityHeading}>{copy.heading}</h2>
        <p className={styles.projectIdentitySubheading}>{copy.subheading}</p>
      </div>

      <div className={styles.projectIdentityPanels}>
        <section className={styles.projectIdentityPanel} aria-labelledby={`${rootId}-left`}>
          <div className={styles.projectIdentityPanelHeader}>
            <h3 id={`${rootId}-left`} className={styles.projectIdentityPanelTitle}>
              {copy.selectColumnsTitle}
            </h3>
            <span className={styles.projectIdentityInfoIcon} title={copy.selectColumnsHint}>
              <LuInfo size={15} aria-hidden />
              <span className={styles.srOnly}>{copy.infoIconAria}</span>
            </span>
          </div>

          <div
            className={styles.projectIdentityColumnList}
            role="group"
            aria-label={copy.selectColumnsTitle}
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
                      row: styles.projectIdentityColumnRow,
                      selected: styles.projectIdentityColumnRowSelected,
                      disabled: styles.projectIdentityColumnRowDisabled,
                    },
                  })}
                  onClick={() => toggle(index)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                >
                  <span className={styles.projectIdentityColumnLabel}>
                    <span className={styles.projectIdentityCheckboxWrap} aria-hidden>
                      <span className={styles.projectIdentityCheckboxFace}>
                        {isSelected ? <LuCheck size={13} strokeWidth={3} /> : null}
                      </span>
                    </span>
                    {order != null ? (
                      <span className={styles.projectIdentityOrderBadge} aria-hidden>
                        {order}
                      </span>
                    ) : null}
                    <span className={styles.projectIdentityColumnName}>{header}</span>
                    {sample ? (
                      <span className={styles.projectIdentityColumnSample} title={sample}>
                        {sample}
                      </span>
                    ) : null}
                  </span>
                  {isSelected && selectedIndexes.length > 1 ? (
                    <span className={styles.projectIdentityReorderGroup}>
                      <button
                        type="button"
                        className={styles.projectIdentityReorderButton}
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
                        className={styles.projectIdentityReorderButton}
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

          {showCombine ? (
            <div className={styles.projectIdentityCombine}>
              <label className={styles.projectIdentityCombineLabel} htmlFor={`${rootId}-sep`}>
                {copy.combineLabel}
              </label>
              <select
                id={`${rootId}-sep`}
                className={styles.projectIdentityCombineSelect}
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
              {primaryExample ? (
                <p className={styles.projectIdentityCombineExample}>
                  <span className={styles.projectIdentityCombineExampleLabel}>
                    {copy.exampleNameLabel}
                  </span>{' '}
                  <strong>{primaryExample}</strong>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={styles.projectIdentityTip}>
            <LuLightbulb className={styles.projectIdentityTipIcon} size={16} aria-hidden />
            <p className={styles.projectIdentityTipText}>{copy.selectColumnsHint}</p>
          </div>
        </section>

        <section
          className={styles.projectIdentityPanel}
          aria-labelledby={`${rootId}-right`}
          aria-live="polite"
          aria-relevant="text"
        >
          <div className={styles.projectIdentityPanelHeader}>
            <h3 id={`${rootId}-right`} className={styles.projectIdentityPanelTitle}>
              {copy.previewTitle}
            </h3>
            <span className={styles.srOnly}>{copy.previewLiveRegionLabel}</span>
          </div>

          {!hasSelection ? (
            <div className={styles.projectIdentityEmpty}>
              <LuUserRound className={styles.projectIdentityEmptyIcon} size={36} aria-hidden />
              <p className={styles.projectIdentityEmptyTitle}>{copy.previewEmptyTitle}</p>
              <p className={styles.projectIdentityEmptyBody}>{copy.previewEmptyBody}</p>
            </div>
          ) : (
            <>
              <div className={styles.projectIdentitySummary}>
                <LuCircleCheck className={styles.projectIdentitySummaryIcon} size={20} aria-hidden />
                <div>
                  <p className={styles.projectIdentitySummaryTitle}>
                    {copy.foundTitle(groups.length)}
                  </p>
                  <p className={styles.projectIdentitySummaryBody}>{copy.foundSupporting}</p>
                </div>
              </div>

              <ul className={styles.projectIdentityGroupList}>
                {preview.visible.map((group) => {
                  const expanded = expandedGroupKey === group.key;
                  return (
                    <li key={group.key} className={styles.projectIdentityGroupItem}>
                      <button
                        type="button"
                        className={styles.projectIdentityGroupButton}
                        aria-expanded={expanded}
                        aria-label={
                          expanded
                            ? copy.collapseGroupAria(group.displayName)
                            : copy.expandGroupAria(group.displayName)
                        }
                        onClick={() =>
                          setExpandedGroupKey((current) =>
                            current === group.key ? null : group.key
                          )
                        }
                      >
                        <span className={styles.projectIdentityGroupLeading}>
                          <span className={styles.projectIdentityGroupIcon} aria-hidden>
                            <LuUserRound size={16} />
                          </span>
                          <span className={styles.projectIdentityGroupMain}>
                            <span className={styles.projectIdentityGroupName}>
                              {group.displayName}
                            </span>
                            <span className={styles.projectIdentityGroupMeta}>
                              {copy.sampleOfRows(
                                Math.min(3, Math.max(1, group.sampleRowLabels.length || 1))
                              )}
                            </span>
                          </span>
                        </span>
                        <span className={styles.projectIdentityGroupTrailing}>
                          <span className={styles.projectIdentityGroupCount}>
                            {copy.rowCountLabel(group.rowCount)}
                          </span>
                          <span className={styles.projectIdentityGroupChevron} aria-hidden>
                            {expanded ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
                          </span>
                        </span>
                      </button>
                      {expanded && group.sampleRowLabels.length > 0 ? (
                        <ul className={styles.projectIdentityGroupSamples}>
                          {group.sampleRowLabels.map((label) => (
                            <li key={`${group.key}-${label}`}>{label}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {preview.remainingCount > 0 ? (
                <p className={styles.projectIdentityMore}>
                  {copy.moreSubprojects(preview.remainingCount)}
                </p>
              ) : null}

              {guidanceView != null ? (
                <div
                  className={[
                    styles.projectIdentityWarning,
                    guidanceView.tone === 'success'
                      ? styles.subprojectIdentityGuidanceAsSuccess
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="status"
                >
                  <div className={styles.projectIdentityWarningBody}>
                    <p className={styles.projectIdentityWarningTitle}>{guidanceView.title}</p>
                    {guidanceView.body ? (
                      <p className={styles.projectIdentityWarningText}>{guidanceView.body}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
