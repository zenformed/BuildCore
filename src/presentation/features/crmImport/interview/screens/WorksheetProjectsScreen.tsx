'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  LuBuilding2,
  LuCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuFileSpreadsheet,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import { CRM_IMPORT_PARENT_LIST_PAGE_SIZE } from '@/domain/crm/spreadsheetImportParentSearch';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import {
  chooseParentRowClassName,
  filterChooseParentCandidates,
  nextChooseParentVisibleLimit,
  pageChooseParentCandidates,
  resolveChooseParentEmptyKind,
  resolveCreatedChooseParentCandidate,
} from '@/presentation/features/crmImport/interview/chooseParentPresentation';
import {
  assignWorksheetExistingProject,
  buildWorksheetProjectRowViews,
  includeWorksheetForAssignment,
  resolveActiveWorksheetId,
  skipWorksheetAssignment,
  summarizeWorksheetProjectSelection,
  type WorksheetProjectConfig,
  type WorksheetProjectStatusKind,
  type WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import type { WorksheetResolutionDraft } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type WorksheetProjectsScreenProps = {
  readonly sheets: readonly WorksheetSheetInput[];
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly activeWorksheetId: string | null;
  readonly parentCandidates: readonly CrmImportParentCandidate[];
  readonly disabled?: boolean;
  /** Solo structure path uses singular Project wording in the page heading. */
  readonly oneProjectPath?: boolean;
  /** Header-rows branch reuses this screen with section-oriented copy. */
  readonly headerRowsPath?: boolean;
  readonly onChangeConfigs: (configs: readonly WorksheetProjectConfig[]) => void;
  readonly onChangeResolutions: (
    resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
  ) => void;
  readonly onSelectWorksheet: (worksheetId: string) => void;
  readonly onRefreshCandidates: () => Promise<readonly CrmImportParentCandidate[]>;
};

function StatusBadge(input: {
  readonly status: WorksheetProjectStatusKind;
  readonly copy: (typeof content.crm.spreadsheetImport.interview)['worksheetProjects'];
}): ReactElement {
  const { status, copy } = input;
  if (status === 'ready') {
    return (
      <span
        className={styles.worksheetProjectsStatusReady}
        title={copy.statusReady}
        aria-label={copy.statusReady}
      >
        <LuCircleCheck size={16} aria-hidden />
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className={styles.worksheetProjectsStatusSkipped}>
        <LuX size={14} aria-hidden />
        {copy.statusSkipped}
      </span>
    );
  }
  if (status === 'no_data') {
    return (
      <span className={styles.worksheetProjectsStatusWarn}>
        <LuCircleAlert size={14} aria-hidden />
        {copy.statusNoData}
      </span>
    );
  }
  if (status === 'needs_header') {
    return (
      <span className={styles.worksheetProjectsStatusWarn}>
        <LuCircleAlert size={14} aria-hidden />
        {copy.statusNeedsHeader}
      </span>
    );
  }
  return (
    <span
      className={styles.worksheetProjectsStatusWarn}
      title={copy.statusNeedsReview}
      aria-label={copy.statusNeedsReview}
    >
      <LuCircleAlert size={16} aria-hidden />
    </span>
  );
}

/**
 * Master-detail worksheet Project assignment after "One Project per worksheet".
 */
export function WorksheetProjectsScreen({
  sheets,
  configs,
  resolutions,
  activeWorksheetId,
  parentCandidates,
  disabled = false,
  oneProjectPath = false,
  headerRowsPath = false,
  onChangeConfigs,
  onChangeResolutions,
  onSelectWorksheet,
  onRefreshCandidates,
}: WorksheetProjectsScreenProps): ReactElement {
  const baseCopy = content.crm.spreadsheetImport.interview.worksheetProjects;
  const headerCopy = content.crm.spreadsheetImport.interview.headerRowProjects;
  const pageHeading = oneProjectPath
    ? baseCopy.pageHeadingOneProject
    : headerRowsPath
      ? headerCopy.pageHeading
      : baseCopy.pageHeading;
  const pageSubheading = headerRowsPath ? headerCopy.pageSubheading : baseCopy.pageSubheading;
  const listHeading = headerRowsPath ? headerCopy.listHeading : baseCopy.listHeading;
  const listAria = headerRowsPath ? headerCopy.listAria : baseCopy.listAria;
  const selectWorksheetAria = headerRowsPath
    ? headerCopy.selectWorksheetAria
    : baseCopy.selectWorksheetAria;
  const currentWorksheetAria = headerRowsPath
    ? headerCopy.currentWorksheetAria
    : baseCopy.currentWorksheetAria;
  const importWorksheetAria = headerRowsPath
    ? headerCopy.importWorksheetAria
    : baseCopy.importWorksheetAria;
  const copy = baseCopy;
  const chooseParent = content.crm.spreadsheetImport.interview.chooseParent;
  const rootId = useId();
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  const sheetsById = useMemo(() => {
    const map = new Map<string, WorksheetSheetInput>();
    for (const sheet of sheets) map.set(sheet.worksheetId, sheet);
    return map;
  }, [sheets]);

  const rowViews = useMemo(
    () => buildWorksheetProjectRowViews({ configs, resolutions, sheetsById }),
    [configs, resolutions, sheetsById]
  );

  const summary = useMemo(() => summarizeWorksheetProjectSelection(configs), [configs]);
  const activeId = resolveActiveWorksheetId(configs, activeWorksheetId);
  const activeRow = rowViews.find((row) => row.config.worksheetId === activeId) ?? rowViews[0];
  const activeConfig = activeRow?.config ?? null;
  const activeResolution =
    activeConfig != null ? resolutions[activeConfig.worksheetId] : null;

  const filtered = useMemo(
    () => filterChooseParentCandidates(parentCandidates, query),
    [parentCandidates, query]
  );
  const paged = useMemo(
    () => pageChooseParentCandidates(filtered, visibleLimit),
    [filtered, visibleLimit]
  );
  const emptyKind = resolveChooseParentEmptyKind({
    totalEligible: parentCandidates.length,
    filteredCount: filtered.length,
    query,
  });

  useEffect(() => {
    setQuery('');
    setVisibleLimit(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
  }, [activeId]);

  const applyIncludeToggle = (worksheetId: string, included: boolean) => {
    if (included) {
      const next = includeWorksheetForAssignment({
        configs,
        resolutions,
        worksheetId,
      });
      onChangeConfigs(next.configs);
      onChangeResolutions(next.resolutions);
      return;
    }
    const next = skipWorksheetAssignment({ configs, resolutions, worksheetId });
    onChangeConfigs(next.configs);
    onChangeResolutions(next.resolutions);
  };

  const assignProject = (candidate: CrmImportParentCandidate) => {
    if (activeConfig == null) return;
    let nextConfigs = configs;
    if (!activeConfig.included) {
      nextConfigs = includeWorksheetForAssignment({
        configs,
        resolutions,
        worksheetId: activeConfig.worksheetId,
      }).configs;
    }
    nextConfigs = nextConfigs.map((config) =>
      config.worksheetId === activeConfig.worksheetId
        ? { ...config, projectName: candidate.name, included: true }
        : config
    );
    onChangeConfigs(nextConfigs);
    onChangeResolutions(
      assignWorksheetExistingProject({
        resolutions,
        worksheetId: activeConfig.worksheetId,
        projectId: candidate.id,
        projectLabel: candidate.name,
      })
    );
  };

  if (activeConfig == null || activeRow == null) {
    return (
      <div className={styles.worksheetProjectsScreen}>
        <header className={styles.worksheetProjectsIntro}>
          <h2 className={styles.worksheetProjectsPageHeading}>
            <LuFileSpreadsheet
              className={styles.worksheetProjectsPageHeadingIcon}
              aria-hidden
              size={22}
            />
            <span>{pageHeading}</span>
          </h2>
          <p className={styles.worksheetProjectsPageSubheading}>{pageSubheading}</p>
        </header>
      </div>
    );
  }

  const detailDisabled =
    disabled || !activeRow.importable || activeRow.status === 'no_data';

  return (
    <div className={styles.worksheetProjectsScreen}>
      <header className={styles.worksheetProjectsIntro}>
        <h2 className={styles.worksheetProjectsPageHeading}>
          <LuFileSpreadsheet
            className={styles.worksheetProjectsPageHeadingIcon}
            aria-hidden
            size={22}
          />
          <span>{pageHeading}</span>
        </h2>
        <p className={styles.worksheetProjectsPageSubheading}>{pageSubheading}</p>
      </header>
      <aside className={styles.worksheetProjectsSidebar} aria-label={listAria}>
        <h3 className={styles.worksheetProjectsListHeading}>
          {listHeading(summary.selectedCount, summary.totalCount)}
        </h3>
        <div className={styles.worksheetProjectsList}>
          {rowViews.map((row) => {
            const current = row.config.worksheetId === activeConfig.worksheetId;
            return (
              <div
                key={row.config.worksheetId}
                className={[
                  styles.worksheetProjectsListItem,
                  current ? styles.worksheetProjectsListItemCurrent : '',
                  row.muted ? styles.worksheetProjectsListItemMuted : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <label
                  className={styles.worksheetProjectsCheckboxLabel}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className={styles.worksheetProjectsCheckbox}
                    checked={row.config.included}
                    disabled={disabled || !row.importable}
                    aria-label={importWorksheetAria(row.config.worksheetName)}
                    onChange={(event) =>
                      applyIncludeToggle(row.config.worksheetId, event.target.checked)
                    }
                  />
                  <span className={styles.worksheetProjectsCheckboxFace} aria-hidden>
                    {row.config.included ? <LuCheck size={12} strokeWidth={3} /> : null}
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.worksheetProjectsListItemMain}
                  disabled={disabled}
                  aria-current={current ? 'true' : undefined}
                  aria-label={
                    current
                      ? currentWorksheetAria(row.config.worksheetName)
                      : selectWorksheetAria(row.config.worksheetName)
                  }
                  onClick={() => onSelectWorksheet(row.config.worksheetId)}
                >
                  <LuFileSpreadsheet
                    className={styles.worksheetProjectsSheetIcon}
                    size={18}
                    aria-hidden
                  />
                  <span className={styles.worksheetProjectsListItemCopy}>
                    <span
                      className={styles.worksheetProjectsSheetName}
                      title={row.config.worksheetName}
                    >
                      {row.config.worksheetName}
                    </span>
                    <span className={styles.worksheetProjectsListItemMeta}>
                      {copy.sheetMeta(row.config.dataRowCount, row.config.columnCount)}
                    </span>
                  </span>
                  <StatusBadge status={row.status} copy={copy} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section className={styles.worksheetProjectsDetail} aria-labelledby={`${rootId}-title`}>
        <header className={styles.worksheetProjectsDetailHeader}>
          <span className={styles.worksheetProjectsDetailIcon} aria-hidden>
            <LuFileSpreadsheet size={22} />
          </span>
          <div>
            <h3 id={`${rootId}-title`} className={styles.worksheetProjectsDetailTitle}>
              {activeConfig.worksheetName}
            </h3>
            <p className={styles.worksheetProjectsDetailMeta}>
              {copy.sheetMeta(activeConfig.dataRowCount, activeConfig.columnCount)}
            </p>
          </div>
        </header>

        <div className={styles.worksheetProjectsFieldBlock}>
          <span className={styles.worksheetProjectsFieldLabel}>{copy.projectLabel}</span>
          <div className={styles.worksheetProjectsProjectToolbar}>
            <label className={styles.worksheetProjectsProjectSearch} htmlFor={`${rootId}-search`}>
              <LuSearch size={16} aria-hidden />
              <input
                id={`${rootId}-search`}
                type="search"
                className={styles.worksheetProjectsProjectSearchInput}
                value={query}
                disabled={detailDisabled || !activeConfig.included}
                placeholder={copy.projectSearchPlaceholder}
                aria-label={copy.projectSearchAria}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleLimit(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
                }}
              />
            </label>
            <button
              ref={createButtonRef}
              type="button"
              className={styles.worksheetProjectsNewProjectButton}
              disabled={detailDisabled || !activeConfig.included}
              onClick={() => setCreateOpen(true)}
            >
              {copy.newProjectButton}
            </button>
          </div>
          <p className={styles.worksheetProjectsFieldHint}>{copy.projectSearchHint}</p>
          <div className={styles.worksheetProjectsPickerList} role="listbox">
            {activeConfig.included && !detailDisabled ? (
              <>
                {emptyKind === 'no_eligible' ? (
                  <p className={styles.worksheetProjectsPickerEmpty}>{chooseParent.noEligibleTitle}</p>
                ) : null}
                {emptyKind === 'no_search_results' ? (
                  <p className={styles.worksheetProjectsPickerEmpty}>{chooseParent.noResultsTitle}</p>
                ) : null}
                {paged.visible.map((candidate) => {
                  const selected = candidate.id === activeResolution?.existingProjectId;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={disabled}
                      className={chooseParentRowClassName({
                        selected,
                        styles: {
                          row: styles.worksheetProjectsPickerRow,
                          selected: styles.worksheetProjectsPickerRowSelected,
                        },
                      })}
                      onClick={() => assignProject(candidate)}
                    >
                      <span className={styles.worksheetProjectsPickerRowMain}>
                        <strong>
                          <LuBuilding2 size={14} aria-hidden /> {candidate.name}
                        </strong>
                        <span>
                          {[candidate.clientName, candidate.locationLabel]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {paged.remainingCount > 0 ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={disabled}
                    onClick={() =>
                      setVisibleLimit((limit) => nextChooseParentVisibleLimit(limit))
                    }
                  >
                    {chooseParent.showMore(paged.remainingCount)}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div
          className={`${styles.worksheetProjectsFieldBlock} ${styles.worksheetProjectsSummaryBlock}`}
        >
          <span className={styles.worksheetProjectsFieldLabel}>{copy.summaryLabel}</span>
          <div className={styles.worksheetProjectsSummaryCard}>
            <span className={styles.worksheetProjectsSummaryIcon} aria-hidden>
              <LuFileSpreadsheet size={42} strokeWidth={1.5} />
            </span>
            <div className={styles.worksheetProjectsSummaryContent}>
              <div className={styles.worksheetProjectsSummaryGrid}>
                <div>
                  <span>{copy.summaryWorksheet}</span>
                  <strong>{activeConfig.worksheetName}</strong>
                </div>
                <div>
                  <span>{copy.summaryRows}</span>
                  <strong>{activeConfig.dataRowCount.toLocaleString()}</strong>
                </div>
                <div>
                  <span>{copy.summaryColumns}</span>
                  <strong>{activeConfig.columnCount.toLocaleString()}</strong>
                </div>
              </div>
              <p className={styles.worksheetProjectsSummaryBody}>
                {copy.summaryBody(activeConfig.dataRowCount)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreateCrmProjectModal
        open={createOpen}
        completionBehavior="select_for_import"
        redirectOnCreate={false}
        onClose={() => {
          setCreateOpen(false);
          queueMicrotask(() => createButtonRef.current?.focus());
        }}
        onCreated={async (created) => {
          setCreateOpen(false);
          const refreshed = await onRefreshCandidates();
          const matched = resolveCreatedChooseParentCandidate(refreshed, created);
          assignProject(matched);
        }}
      />
    </div>
  );
}
