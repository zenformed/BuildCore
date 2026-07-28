'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { LuBuilding2, LuCheck, LuListTree, LuPencil, LuRows3, LuTriangleAlert, LuUsers } from 'react-icons/lu';
import { SPREADSHEET_IMPORT_LIMITS } from '@/domain/crm/spreadsheetImportLimits';
import { listUnassignedRowsBeforeFirstProjectHeader } from '@/domain/crm/spreadsheetImportProjectHeaderDetection';
import { toUserFacingSpreadsheetRowNumber } from '@/domain/crm/spreadsheetImportHeaderDetection';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildProjectHeaderRowPreviewModels,
  buildProjectHeaderRowsSummary,
  buildProjectHeaderSpreadsheetRowHighlight,
  findProjectHeaderGroupForRow,
  mergeHeaderRowNameOverride,
  projectHeaderGroupAccentIndex,
  projectHeaderSpreadsheetRowClassNames,
  resolveActiveGroupId,
  adjacentProjectHeaderGroupId,
  shouldToggleProjectHeaderOnGroupCardClick,
  shouldToggleProjectHeaderOnSpreadsheetRowClick,
  toggleProjectHeaderRowSelection,
  type ProjectHeaderGroupCardStatus,
} from '@/presentation/features/crmImport/interview/projectHeaderRowsPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

const PROJECT_HEADER_ACCENT_CLASSES = [
  styles.projectHeaderAccent0,
  styles.projectHeaderAccent1,
  styles.projectHeaderAccent2,
  styles.projectHeaderAccent3,
  styles.projectHeaderAccent4,
  styles.projectHeaderAccent5,
  styles.projectHeaderAccent6,
  styles.projectHeaderAccent7,
] as const;

function projectHeaderStatusLabel(
  status: ProjectHeaderGroupCardStatus,
  screen: (typeof content.crm.spreadsheetImport.interview)['projectHeaderRows']
): string {
  switch (status) {
    case 'ready':
      return screen.statusReady;
    case 'needs_review':
      return screen.statusNeedsReview;
    case 'unassigned_rows':
      return screen.statusUnassigned;
    case 'invalid_name':
      return screen.statusInvalidName;
  }
}

export type ProjectHeaderRowsScreenProps = {
  readonly busy: boolean;
  readonly sheetMatrix: readonly (readonly string[])[];
  readonly columnHeaderRowIndex: number;
  readonly selectedHeaderRowIndexes: readonly number[];
  readonly nameOverrides: Readonly<Record<number, string>>;
  /** 1-based spreadsheet row numbers excluded from import. */
  readonly excludedRowNumbers: ReadonlySet<number>;
  readonly truncated: boolean;
  readonly onChangeSelectedHeaderRows: (indexes: readonly number[]) => void;
  readonly onChangeNameOverrides: (overrides: Readonly<Record<number, string>>) => void;
  readonly onExcludeRows: (userFacingRowNumbers: readonly number[]) => void;
};

export function ProjectHeaderRowsScreen({
  busy,
  sheetMatrix,
  columnHeaderRowIndex,
  selectedHeaderRowIndexes,
  nameOverrides,
  excludedRowNumbers,
  truncated,
  onChangeSelectedHeaderRows,
  onChangeNameOverrides,
  onExcludeRows,
}: ProjectHeaderRowsScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const screen = copy.interview.projectHeaderRows;
  const colCount = Math.min(
    Math.max(...sheetMatrix.map((row) => row.length), 0),
    SPREADSHEET_IMPORT_LIMITS.maxColumns
  );
  const columnHeaderCells = sheetMatrix[columnHeaderRowIndex] ?? [];

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const groupsListRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const [preferredActiveGroupId, setPreferredActiveGroupId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);

  const excludedZeroBased = useMemo(() => {
    const set = new Set<number>();
    for (const n of excludedRowNumbers) set.add(n - 1);
    return set;
  }, [excludedRowNumbers]);

  const previewModels = useMemo(
    () =>
      buildProjectHeaderRowPreviewModels({
        matrix: sheetMatrix,
        columnHeaderRowIndex,
        selectedHeaderRowIndexes,
        nameOverrides,
        excludedRowIndexes: excludedZeroBased,
      }),
    [
      sheetMatrix,
      columnHeaderRowIndex,
      selectedHeaderRowIndexes,
      nameOverrides,
      excludedZeroBased,
    ]
  );

  const groups = useMemo(
    () => previewModels.map((model) => model.group),
    [previewModels]
  );

  const summary = useMemo(
    () =>
      buildProjectHeaderRowsSummary({
        matrix: sheetMatrix,
        columnHeaderRowIndex,
        selectedHeaderRowIndexes,
        nameOverrides,
        excludedRowIndexes: excludedZeroBased,
      }),
    [
      sheetMatrix,
      columnHeaderRowIndex,
      selectedHeaderRowIndexes,
      nameOverrides,
      excludedZeroBased,
    ]
  );

  const unassignedBefore = useMemo(
    () =>
      listUnassignedRowsBeforeFirstProjectHeader({
        matrix: sheetMatrix,
        columnHeaderRowIndex,
        selectedHeaderRowIndexes,
        excludedRowIndexes: excludedZeroBased,
      }),
    [sheetMatrix, columnHeaderRowIndex, selectedHeaderRowIndexes, excludedZeroBased]
  );

  const unassignedSet = useMemo(() => new Set(unassignedBefore), [unassignedBefore]);
  const selectedSet = useMemo(
    () => new Set(selectedHeaderRowIndexes),
    [selectedHeaderRowIndexes]
  );

  const activeGroupId = useMemo(
    () =>
      resolveActiveGroupId({
        groups,
        preferredGroupId: preferredActiveGroupId,
      }),
    [groups, preferredActiveGroupId]
  );

  const activeGroup = useMemo(
    () => groups.find((group) => group.groupId === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  useEffect(() => {
    if (activeGroupId == null) return;
    const row = rowRefs.current.get(activeGroup?.headerRowIndex ?? -1);
    const wrap = tableWrapRef.current;
    if (row != null && wrap != null) {
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    const card = cardRefs.current.get(activeGroupId);
    if (card != null) {
      card.scrollIntoView({ block: 'nearest' });
    }
  }, [activeGroupId, activeGroup?.headerRowIndex]);

  const toggleRow = (zeroBasedIndex: number) => {
    if (busy || zeroBasedIndex === columnHeaderRowIndex) return;
    const nextSelected = !selectedSet.has(zeroBasedIndex);
    onChangeSelectedHeaderRows(
      toggleProjectHeaderRowSelection(selectedHeaderRowIndexes, zeroBasedIndex, nextSelected)
    );
    if (nextSelected) {
      setPreferredActiveGroupId(`hr:${zeroBasedIndex}`);
    }
  };

  const focusGroup = (groupId: string) => {
    setPreferredActiveGroupId(groupId);
  };

  const handleSpreadsheetRowClick = (zeroBasedIndex: number) => {
    if (busy || zeroBasedIndex === columnHeaderRowIndex) return;
    if (shouldToggleProjectHeaderOnSpreadsheetRowClick()) {
      toggleRow(zeroBasedIndex);
      return;
    }
    const group = findProjectHeaderGroupForRow(groups, zeroBasedIndex);
    if (group != null) {
      focusGroup(group.groupId);
    }
  };

  const handleGroupCardActivate = (groupId: string) => {
    if (shouldToggleProjectHeaderOnGroupCardClick()) return;
    focusGroup(groupId);
  };

  const handleGroupCardKeyDown = (event: KeyboardEvent<HTMLLIElement>, groupId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGroupCardActivate(groupId);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const nextId = adjacentProjectHeaderGroupId(
      previewModels.map((model) => model.group),
      groupId,
      event.key === 'ArrowDown' ? 'next' : 'previous'
    );
    if (nextId == null) return;
    focusGroup(nextId);
    cardRefs.current.get(nextId)?.focus();
  };

  return (
    <div className={styles.projectHeaderRowsScreen}>
      <div className={styles.headerScreenIntro}>
        <h2 className={styles.headerScreenHeading}>
          <LuListTree className={styles.headerScreenHeadingIcon} aria-hidden size={22} />
          <span>{screen.heading}</span>
        </h2>
        <p className={styles.headerScreenHint}>{screen.hint}</p>
      </div>

      <div
        className={styles.projectHeaderSummaryBar}
        role="status"
        aria-live="polite"
        aria-label={screen.summaryAria}
      >
        <span className={styles.projectHeaderSummaryMetric}>
          {screen.summaryProjectGroups(summary.projectGroupCount)}
        </span>
        <span className={styles.projectHeaderSummarySep} aria-hidden>
          ·
        </span>
        <span className={styles.projectHeaderSummaryMetric}>
          {screen.summarySubprojects(summary.subprojectCount)}
        </span>
        <span className={styles.projectHeaderSummarySep} aria-hidden>
          ·
        </span>
        <span
          className={[
            styles.projectHeaderSummaryMetric,
            summary.unassignedRowCount > 0 ? styles.projectHeaderSummaryUnassignedWarn : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {screen.summaryUnassigned(summary.unassignedRowCount)}
        </span>
      </div>

      <div className={styles.projectHeaderRowsLayout}>
        <div className={styles.projectHeaderTableColumn}>
          {unassignedBefore.length > 0 ? (
            <div className={styles.projectHeaderTableWarn} role="status">
              <LuTriangleAlert size={16} aria-hidden />
              <span>{screen.unassignedTableWarning(unassignedBefore.length)}</span>
              <button
                type="button"
                className={styles.projectHeaderExcludeButtonInline}
                disabled={busy}
                onClick={() =>
                  onExcludeRows(
                    unassignedBefore.map((index) => toUserFacingSpreadsheetRowNumber(index))
                  )
                }
              >
                {screen.excludeUnassigned}
              </button>
            </div>
          ) : null}

          <div
            ref={tableWrapRef}
            className={styles.headerPreviewWrap}
            role="group"
            aria-label={screen.previewAriaLabel}
          >
            <table className={styles.headerPreviewTable}>
              <thead>
                <tr>
                  <th className={styles.stickySelectCol} scope="col">
                    <span className={styles.srOnly}>{copy.upload.selectColumnAria}</span>
                  </th>
                  <th className={styles.stickyRowCol} scope="col">
                    {copy.upload.rowColumnLabel}
                  </th>
                  {Array.from({ length: colCount }, (_, index) => {
                    const value = (columnHeaderCells[index] ?? '').trim();
                    const label = value || copy.interview.header.columnFallback(index);
                    return (
                      <th key={`col-${index}`} scope="col" title={label}>
                        <span className={styles.cellClamp}>{label}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sheetMatrix.map((row, zeroBasedIndex) => {
                  const userRow = toUserFacingSpreadsheetRowNumber(zeroBasedIndex);
                  const isColumnHeader = zeroBasedIndex === columnHeaderRowIndex;
                  const isSelected = selectedSet.has(zeroBasedIndex);
                  const highlight = buildProjectHeaderSpreadsheetRowHighlight({
                    rowIndex: zeroBasedIndex,
                    columnHeaderRowIndex,
                    selectedHeaderRowIndexes: selectedSet,
                    unassignedRowIndexes: unassignedSet,
                    excludedRowIndexes: excludedZeroBased,
                    activeGroup,
                    hoverGroup: null,
                    groups,
                  });
                  const roleClasses = projectHeaderSpreadsheetRowClassNames(highlight)
                    .map((key) => {
                      if (key.startsWith('projectHeaderAccent')) {
                        const index = Number(key.replace('projectHeaderAccent', ''));
                        return PROJECT_HEADER_ACCENT_CLASSES[index] ?? '';
                      }
                      return styles[key as keyof typeof styles] ?? '';
                    })
                    .filter(Boolean);
                  const disabled = busy || isColumnHeader;
                  const rowGroup = findProjectHeaderGroupForRow(groups, zeroBasedIndex);

                  return (
                    <tr
                      key={`preview-row-${zeroBasedIndex}`}
                      ref={(node) => {
                        if (node) rowRefs.current.set(zeroBasedIndex, node);
                        else rowRefs.current.delete(zeroBasedIndex);
                      }}
                      className={[
                        styles.previewRowButton,
                        styles.headerRowUnselected,
                        ...roleClasses,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-selected={isSelected}
                      data-project-header={highlight.isProjectHeader ? 'true' : undefined}
                      data-active-group={highlight.inActiveGroup ? 'true' : undefined}
                      data-accent-index={
                        highlight.accentIndex != null ? String(highlight.accentIndex) : undefined
                      }
                      onClick={() => handleSpreadsheetRowClick(zeroBasedIndex)}
                      onMouseEnter={() => {
                        if (rowGroup != null) setHoverGroupId(rowGroup.groupId);
                      }}
                      onMouseLeave={() => setHoverGroupId(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleSpreadsheetRowClick(zeroBasedIndex);
                        }
                      }}
                    >
                      <td className={styles.stickySelectCol}>
                        {isColumnHeader ? (
                          <span className={styles.projectHeaderColumnHeaderMark} aria-hidden>
                            —
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            className={[
                              styles.headerRowCheckbox,
                              isSelected ? styles.projectHeaderSectionCheckbox : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            checked={isSelected}
                            disabled={disabled}
                            aria-label={screen.selectRowAsProject(userRow)}
                            onChange={() => toggleRow(zeroBasedIndex)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        )}
                      </td>
                      <td className={styles.stickyRowCol}>
                        <span className={styles.projectHeaderRowLabelCluster}>
                          {isSelected ? (
                            <LuBuilding2
                              className={styles.projectHeaderSectionIcon}
                              size={14}
                              aria-hidden
                            />
                          ) : null}
                          <span className={styles.headerRowNumber}>{userRow}</span>
                          {isColumnHeader ? (
                            <span className={styles.headerSelectedBadge}>
                              {screen.columnHeaderBadge}
                            </span>
                          ) : isSelected ? (
                            <span className={styles.projectHeaderSectionBadge}>
                              {screen.selectedAsProject}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      {Array.from({ length: colCount }, (_, colIndex) => {
                        const value = row[colIndex] ?? '';
                        return (
                          <td key={`cell-${zeroBasedIndex}-${colIndex}`} title={value}>
                            <span className={styles.cellClamp}>{value}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.projectHeaderGroupsPanel} aria-label={screen.groupsAriaLabel}>
          <h3 className={styles.projectHeaderGroupsHeading}>
            <LuBuilding2 size={18} aria-hidden />
            <span>{screen.groupsHeading}</span>
          </h3>

          {previewModels.length === 0 ? (
            <p className={styles.projectHeaderGroupsEmpty}>{screen.emptyGroups}</p>
          ) : (
            <ul
              ref={groupsListRef}
              className={styles.projectHeaderGroupsList}
              role="listbox"
              aria-label={screen.groupsListAria}
            >
              {previewModels.map((model, groupOrdinal) => {
                const selected = model.group.groupId === activeGroupId;
                const hovered = model.group.groupId === hoverGroupId;
                const accentIndex = projectHeaderGroupAccentIndex(groupOrdinal);
                const accentClass = PROJECT_HEADER_ACCENT_CLASSES[accentIndex] ?? '';
                const statusLabel = projectHeaderStatusLabel(model.status, screen);
                const statusClass =
                  model.status === 'ready'
                    ? styles.projectHeaderCardStatusReady
                    : model.status === 'invalid_name'
                      ? styles.projectHeaderCardStatusDanger
                      : styles.projectHeaderCardStatusWarn;
                const summaryText =
                  model.childCount > 0
                    ? screen.importSummary(model.importSummaryName, model.childCount)
                    : screen.importSummaryEmpty(model.importSummaryName);

                return (
                  <li
                    key={model.group.groupId}
                    ref={(node) => {
                      if (node) cardRefs.current.set(model.group.groupId, node);
                      else cardRefs.current.delete(model.group.groupId);
                    }}
                    className={[
                      styles.projectHeaderGroupCard,
                      accentClass,
                      selected ? styles.projectHeaderGroupCardSelected : '',
                      hovered && !selected ? styles.projectHeaderGroupCardHover : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="option"
                    tabIndex={0}
                    aria-selected={selected}
                    data-accent-index={String(accentIndex)}
                    data-status={model.status}
                    aria-label={[
                      screen.selectGroupCardAria(model.group.displayName || model.importSummaryName),
                      screen.statusAria(statusLabel),
                      selected ? screen.selectedCardAria : null,
                    ]
                      .filter(Boolean)
                      .join('. ')}
                    onClick={() => handleGroupCardActivate(model.group.groupId)}
                    onKeyDown={(event) => handleGroupCardKeyDown(event, model.group.groupId)}
                    onMouseEnter={() => setHoverGroupId(model.group.groupId)}
                    onMouseLeave={() => setHoverGroupId(null)}
                  >
                    <div className={styles.projectHeaderCardHeader}>
                      <label
                        className={styles.projectHeaderGroupNameLabel}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className={styles.srOnly}>{screen.projectNameLabel}</span>
                        <span className={styles.projectHeaderNameEditWrap}>
                          <input
                            type="text"
                            className={styles.projectHeaderGroupNameInput}
                            value={model.group.displayName}
                            disabled={busy}
                            aria-label={screen.projectNameAria(model.userFacingHeaderRow)}
                            onChange={(event) =>
                              onChangeNameOverrides(
                                mergeHeaderRowNameOverride(
                                  nameOverrides,
                                  model.group.headerRowIndex,
                                  event.target.value
                                )
                              )
                            }
                            onFocus={() => focusGroup(model.group.groupId)}
                          />
                          <LuPencil
                            className={styles.projectHeaderNameEditIcon}
                            size={13}
                            aria-hidden
                          />
                        </span>
                      </label>
                      <span
                        className={[styles.projectHeaderCardStatus, statusClass].join(' ')}
                        role="status"
                      >
                        {statusLabel}
                      </span>
                      {selected ? (
                        <span
                          className={styles.projectHeaderCardSelectedMark}
                          aria-hidden
                          title={screen.selectedCardAria}
                        >
                          <LuCheck size={12} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.projectHeaderCardMeta}>
                      <span className={styles.projectHeaderCardMetaItem}>
                        <LuUsers size={13} aria-hidden />
                        <span>{screen.subprojectCount(model.childCount)}</span>
                      </span>
                      {model.rangeLabel ? (
                        <span className={styles.projectHeaderCardMetaItem}>
                          <LuRows3 size={13} aria-hidden />
                          <span>{model.rangeLabel}</span>
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.projectHeaderCardPreviewBlock}>
                      <p className={styles.projectHeaderCardPreviewLabel}>{screen.previewLabel}</p>
                      {model.childPreviews.length > 0 ? (
                        <ul className={styles.projectHeaderGroupPreviewList}>
                          {model.childPreviews.map((preview, index) => (
                            <li key={`${model.group.groupId}-preview-${index}`}>{preview}</li>
                          ))}
                          {model.childOverflowCount > 0 ? (
                            <li className={styles.projectHeaderGroupPreviewMore}>
                              {screen.moreChildren(model.childOverflowCount)}
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className={styles.projectHeaderGroupPreview}>{screen.noChildren}</p>
                      )}
                    </div>

                    <p className={styles.projectHeaderCardImportSummary}>{summaryText}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {truncated ? <p className={styles.notice}>{copy.interview.upload.truncatedNotice}</p> : null}
    </div>
  );
}
