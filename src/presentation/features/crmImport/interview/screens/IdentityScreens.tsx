'use client';

import { useId, useMemo, useState, type ReactElement } from 'react';
import {
  LuBuilding2,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuInfo,
  LuLightbulb,
} from 'react-icons/lu';
import {
  CRM_IMPORT_NAME_SEPARATORS,
  composeImportNameExample,
  isCompositionConfigured,
  type CrmImportColumnComposition,
  type CrmImportNameSeparator,
} from '@/domain/crm/spreadsheetImportComposition';
import { analyzeProjectIdentitySelection } from '@/domain/crm/spreadsheetImportProjectIdentityGuidance';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildProjectIdentityExampleTable,
  buildProjectIdentityPreviewGroups,
  buildProjectIdentityWarningView,
  projectIdentityColumnRowClass,
  shouldShowProjectIdentityCombineControl,
} from '@/presentation/features/crmImport/interview/projectIdentityPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export { SubprojectIdentityScreen } from '@/presentation/features/crmImport/interview/screens/SubprojectIdentityScreen';
export type { SubprojectIdentityScreenProps } from '@/presentation/features/crmImport/interview/screens/SubprojectIdentityScreen';

const DEFAULT_SEPARATOR: CrmImportNameSeparator = ' ';

export type ProjectIdentityGroupPreview = {
  readonly groupKey: string;
  readonly displayName: string;
  readonly rowCount: number;
  readonly sourceRowIndexes: readonly number[];
};

export type ProjectIdentityScreenProps = {
  readonly headers: readonly string[];
  readonly sampleRows: readonly (readonly string[])[];
  /** Full data rows (cells only) used for grouping guidance and examples. */
  readonly dataRows: readonly (readonly string[])[];
  readonly dataRowsBySourceIndex: ReadonlyMap<number, readonly string[]>;
  readonly composition: CrmImportColumnComposition | null;
  readonly groups: readonly ProjectIdentityGroupPreview[];
  readonly disabled?: boolean;
  readonly onChange: (composition: CrmImportColumnComposition) => void;
  readonly onChooseOneProject?: () => void;
};

export function ProjectIdentityScreen({
  headers,
  sampleRows,
  dataRows,
  dataRowsBySourceIndex,
  composition,
  groups,
  disabled = false,
  onChange,
  onChooseOneProject,
}: ProjectIdentityScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.projectIdentity;
  const selectId = useId();
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  const selectedIndexes = composition?.columnIndexes ?? [];
  const separator = composition?.separator ?? DEFAULT_SEPARATOR;
  const selectedSet = new Set(selectedIndexes);
  const hasSelection = isCompositionConfigured(composition);

  const guidance = useMemo(
    () =>
      analyzeProjectIdentitySelection({
        headers,
        dataRows,
        composition,
        groupCount: hasSelection ? groups.length : null,
      }),
    [headers, dataRows, composition, groups.length, hasSelection]
  );

  const warning = useMemo(
    () => buildProjectIdentityWarningView(guidance, copy),
    [guidance, copy]
  );

  const preview = useMemo(() => {
    if (!hasSelection || composition == null) {
      return { visible: [] as const, remainingCount: 0 };
    }
    return buildProjectIdentityPreviewGroups({
      groups,
      dataRowsBySourceIndex,
      composition,
    });
  }, [hasSelection, composition, groups, dataRowsBySourceIndex]);

  const exampleTable = useMemo(() => {
    if (!hasSelection || composition == null) {
      return { columns: [] as const, rows: [] as const };
    }
    return buildProjectIdentityExampleTable({
      headers,
      dataRows,
      composition,
      composedNameLabel: copy.composedNameColumn,
    });
  }, [hasSelection, composition, headers, dataRows, copy.composedNameColumn]);

  const liveExamples =
    hasSelection && composition != null
      ? composeImportNameExample(sampleRows, composition, 1)
      : [];

  const toggle = (index: number) => {
    if (disabled) return;
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

  return (
    <div className={styles.projectIdentityScreen}>
      <div className={styles.projectIdentityIntro}>
        <h2 className={styles.projectIdentityHeading}>{copy.heading}</h2>
        <p className={styles.projectIdentitySubheading}>{copy.subheading}</p>
      </div>

      <div className={styles.projectIdentityPanels}>
        <section className={styles.projectIdentityPanel} aria-labelledby={`${selectId}-left`}>
          <div className={styles.projectIdentityPanelHeader}>
            <h3 id={`${selectId}-left`} className={styles.projectIdentityPanelTitle}>
              {copy.selectColumnsTitle}
            </h3>
            <span className={styles.projectIdentityInfoIcon} title={copy.selectColumnsHint}>
              <LuInfo size={15} aria-hidden />
              <span className={styles.srOnly}>{copy.infoIconAria}</span>
            </span>
          </div>

          <div className={styles.projectIdentityColumnList} role="group" aria-label={copy.selectColumnsTitle}>
            {headers.map((header, index) => {
              const isSelected = selectedSet.has(index);
              const order = isSelected ? selectedIndexes.indexOf(index) + 1 : null;
              const sample =
                sampleRows.find((row) => (row[index] ?? '').trim() !== '')?.[index] ?? '';
              return (
                <div
                  key={`${header}-${index}`}
                  className={projectIdentityColumnRowClass({
                    selected: isSelected,
                    disabled,
                    styles: {
                      row: styles.projectIdentityColumnRow,
                      selected: styles.projectIdentityColumnRowSelected,
                      disabled: styles.projectIdentityColumnRowDisabled,
                    },
                  })}
                >
                  <label className={styles.projectIdentityColumnLabel}>
                    <span className={styles.projectIdentityCheckboxWrap} aria-hidden={!isSelected}>
                      <input
                        type="checkbox"
                        className={styles.projectIdentityCheckboxInput}
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggle(index)}
                        aria-label={
                          order != null
                            ? `${header}, ${copy.orderBadgeAria(order)}`
                            : header
                        }
                      />
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
                  </label>
                  {isSelected && selectedIndexes.length > 1 ? (
                    <span className={styles.projectIdentityReorderGroup}>
                      <button
                        type="button"
                        className={styles.projectIdentityReorderButton}
                        disabled={disabled || order === 1}
                        onClick={() => reorder(index, -1)}
                        aria-label={`Move ${header} earlier in composition order`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.projectIdentityReorderButton}
                        disabled={disabled || order === selectedIndexes.length}
                        onClick={() => reorder(index, 1)}
                        aria-label={`Move ${header} later in composition order`}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {shouldShowProjectIdentityCombineControl(selectedIndexes.length) ? (
            <div className={styles.projectIdentityCombine}>
              <label className={styles.projectIdentityCombineLabel} htmlFor={`${selectId}-sep`}>
                {copy.combineLabel}
              </label>
              <select
                id={`${selectId}-sep`}
                className={styles.projectIdentityCombineSelect}
                value={separator}
                disabled={disabled}
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
              {liveExamples[0] ? (
                <p className={styles.projectIdentityCombineExample}>
                  <span className={styles.projectIdentityCombineExampleLabel}>
                    {copy.exampleNameLabel}
                  </span>{' '}
                  <strong>{liveExamples[0]}</strong>
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
          aria-labelledby={`${selectId}-right`}
          aria-live="polite"
          aria-relevant="text"
        >
          <div className={styles.projectIdentityPanelHeader}>
            <h3 id={`${selectId}-right`} className={styles.projectIdentityPanelTitle}>
              {copy.previewTitle}
            </h3>
            <span className={styles.srOnly}>{copy.previewLiveRegionLabel}</span>
          </div>

          {!hasSelection ? (
            <div className={styles.projectIdentityEmpty}>
              <LuBuilding2 className={styles.projectIdentityEmptyIcon} size={36} aria-hidden />
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
                        <span className={styles.projectIdentityGroupIcon} aria-hidden>
                          <LuBuilding2 size={16} />
                        </span>
                        <span className={styles.projectIdentityGroupMain}>
                          <span className={styles.projectIdentityGroupName}>{group.displayName}</span>
                          <span className={styles.projectIdentityGroupMeta}>
                            {copy.sampleOfRows(
                              Math.min(3, Math.max(1, group.sampleRowLabels.length || 1))
                            )}
                          </span>
                        </span>
                        <span className={styles.projectIdentityGroupCount}>
                          {copy.rowCountLabel(group.rowCount)}
                        </span>
                        <span className={styles.projectIdentityGroupChevron} aria-hidden>
                          {expanded ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
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
                <p className={styles.projectIdentityMore}>{copy.moreProjects(preview.remainingCount)}</p>
              ) : null}

              {exampleTable.rows.length > 0 ? (
                <div className={styles.projectIdentityExample}>
                  <p className={styles.projectIdentityExampleTitle}>{copy.exampleRowsTitle}</p>
                  <div className={styles.projectIdentityExampleScroll}>
                    <table className={styles.projectIdentityExampleTable}>
                      <thead>
                        <tr>
                          {exampleTable.columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exampleTable.rows.map((row) => (
                          <tr key={row.key}>
                            {row.cells.map((cell, cellIndex) => (
                              <td key={`${row.key}-${cellIndex}`} title={cell || undefined}>
                                {cell || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {warning ? (
                <div className={styles.projectIdentityWarning} role="status">
                  <div className={styles.projectIdentityWarningBody}>
                    <p className={styles.projectIdentityWarningTitle}>{warning.title}</p>
                    <p className={styles.projectIdentityWarningText}>{warning.body}</p>
                  </div>
                  {warning.showChooseOneAction && onChooseOneProject ? (
                    <button
                      type="button"
                      className={styles.projectIdentityWarningAction}
                      disabled={disabled}
                      onClick={onChooseOneProject}
                    >
                      {warning.actionLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
