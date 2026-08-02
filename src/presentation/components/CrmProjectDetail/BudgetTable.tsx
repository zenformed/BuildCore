'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmBudgetEntry } from '@/domain/crm';
import { deleteCrmBudgetEntry } from '@/application/use-cases/crm/deleteCrmBudgetEntry';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import {
  EMPTY_BUDGET_LIST_FILTERS,
  filterBudgetEntriesByListFilters,
  isBudgetListFiltersActive,
  type BudgetListFilters,
} from '@/presentation/features/crmProjectDetail/budgetFilterModel';
import { filterBudgetEntriesBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useBudgetEntryActions } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import { BudgetEntryRowSelectionProvider } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { crmRepositories } from '@/shared/di/container';
import { BudgetCategoryFilterMenu } from './BudgetCategoryFilterMenu';
import { BudgetDraftRow } from './BudgetDraftRow';
import { BudgetInlineRow } from './BudgetInlineRow';
import { BudgetTableHeaderRow } from './BudgetTableHeaderRow';
import { BudgetTableBulkActions } from './BudgetTableBulkActions';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import { CrmDirectUploadStatusHost } from './CrmDirectUploadStatus';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import {
  BudgetMobileBulkSelectAllRow,
  BudgetMobileBulkToolbar,
  BudgetMobileSearchToolsRow,
} from './MobileBulkSelectionChrome';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { useBudgetEntryRowSelection } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import styles from './ProjectDetail.module.css';

export type BudgetTableProps = {
  onError: (message: string) => void;
  /** When true, header actions render in the shared folder tab bar. */
  embeddedInFolderTabs?: boolean;
};

function BudgetHeaderSelectCell(): ReactElement {
  const rowSelection = useBudgetEntryRowSelection();
  if (rowSelection == null) return <span aria-hidden />;
  return (
    <BulkSelectCheckbox
      checked={rowSelection.allVisibleSelected}
      indeterminate={rowSelection.someVisibleSelected}
      ariaLabel={rowSelection.selectAllAriaLabel}
      onChange={() => rowSelection.onToggleAllVisible()}
    />
  );
}

function BudgetHeaderPrimaryCell({
  label,
  collapsed,
  onToggle,
  itemCount,
}: {
  readonly label: string;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly itemCount: number;
}): ReactElement {
  const rowSelection = useBudgetEntryRowSelection();
  const showBulkActions = rowSelection != null && rowSelection.selectedCount > 0;
  const itemCountLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;
  return (
    <span className={styles.stageGroupPrimary}>
      <span className={styles.stageGroupPrimaryCluster}>
        <button
          type="button"
          className={styles.stageGroupHeaderBtn}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
        >
          <span className={styles.stageGroupTitle}>
            <span className={styles.stageGroupName}>{label}</span>
            {!showBulkActions ? <span className={styles.stageGroupCount}>{itemCountLabel}</span> : null}
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={collapsed ? styles.stageGroupChevron : styles.stageGroupChevron_expanded} />
            </span>
          </span>
        </button>
        {showBulkActions ? (
          <span
            className={styles.stageGroupHeaderBulk}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <BudgetTableBulkActions />
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function BudgetTable({
  onError,
  embeddedInFolderTabs = false,
}: BudgetTableProps): ReactElement {
  const {
    project,
    handleBudgetEntryPatched,
    handleBudgetEntryCreated,
    handleBudgetEntryDeleted,
    refreshBudgetSection,
    setToast,
    guardProjectEdit,
    projectMutationsLocked,
  } = useProjectDetailShell();
  const { budget: budgetAccess } = useBuildCoreProjectSectionAccess();
  const { permissions, isReady } = budgetAccess;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete && !projectMutationsLocked;
  const b = content.projectDetail.budget;
  const [filters, setFilters] = useState<BudgetListFilters>(EMPTY_BUDGET_LIST_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<CrmBudgetEntry | null>(null);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const isMobileLayout = useDashboardMobileLayout();
  const filtersActive = isBudgetListFiltersActive(filters);

  const { createEntry, updateEntry, deleteEntry } = useBudgetEntryActions({
    projectId: project.summary.id,
    projectSlug: project.summary.slug,
    onEntryPatched: handleBudgetEntryPatched,
    onEntryCreated: handleBudgetEntryCreated,
    onEntryDeleted: handleBudgetEntryDeleted,
    onError,
  });

  const filtered = useMemo(() => {
    const byFilters = filterBudgetEntriesByListFilters(project.budget.entries, filters);
    return filterBudgetEntriesBySearch(byFilters, searchQuery);
  }, [filters, project.budget.entries, searchQuery]);

  const visibleEntryIds = useMemo(() => filtered.map((entry) => entry.id), [filtered]);

  const selectionBulkActions = useMemo(
    () => ({
      canDelete,
      onDeleteEntries: async (entryIds: readonly string[]) => {
        let deletedCount = 0;
        let failedCount = 0;
        for (const entryId of entryIds) {
          try {
            const deleted = await deleteCrmBudgetEntry(crmRepositories, {
              entryId,
              projectSlug: project.summary.slug,
            });
            if (!deleted) {
              failedCount += 1;
              continue;
            }
            handleBudgetEntryDeleted(entryId);
            deletedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        return { deletedCount, failedCount };
      },
    }),
    [canDelete, handleBudgetEntryDeleted, project.summary.slug]
  );

  const totals = useMemo(() => {
    let cost = 0;
    let budget = 0;
    for (const entry of filtered) {
      cost += entry.costCents;
      budget += entry.budgetCents;
    }
    return { cost, budget, diff: budget - cost };
  }, [filtered]);

  const showMobileList = filtered.length > 0 || draftOpen || filtersActive || searchQuery.trim().length > 0;
  const showDesktopTable =
    filtered.length > 0 ||
    draftOpen ||
    canCreate ||
    filtersActive ||
    searchQuery.trim().length > 0;
  const showTable = isMobileLayout ? showMobileList : showDesktopTable;

  const searchInput = (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={b.searchPlaceholder}
      ariaLabel={b.searchAriaLabel}
    />
  );

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={b.tableTitle}
      onRefresh={refreshBudgetSection}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );

  const mobileAddButton = canCreate ? (
    <div className={styles.detailPanelHeaderBtnWrap}>
      <DetailPanelHeaderButton
        variant="add"
        disabled={draftOpen}
        title={b.addItem}
        onClick={() => {
          guardProjectEdit(() => {
            setDraftOpen(true);
          });
        }}
      />
      <CrmDirectUploadStatusHost />
    </div>
  ) : (
    <div className={styles.detailPanelHeaderBtnWrap}>
      <CrmDirectUploadStatusHost />
    </div>
  );

  const filterCaret = (
    <BudgetCategoryFilterMenu
      filters={filters}
      onChange={setFilters}
      triggerVariant="caret"
      menuAlign="start"
    />
  );

  const filterGhost = (
    <BudgetCategoryFilterMenu
      filters={filters}
      onChange={setFilters}
      triggerVariant="ghost"
      menuAlign="end"
    />
  );

  const desktopAddButton = canCreate ? (
    <DetailPanelHeaderButton
      variant="add"
      disabled={draftOpen}
      title={b.addItem}
      onClick={() => {
        guardProjectEdit(() => {
          setDraftOpen(true);
        });
      }}
    />
  ) : null;

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEntry) return;
    const entryId = deleteConfirmEntry.id;
    setDeleteConfirmEntry(null);
    await deleteEntry(entryId);
  };

  const handleDraftSave = async (draft: Parameters<typeof createEntry>[0]) => {
    await createEntry(draft);
    setDraftOpen(false);
  };

  return (
    <BudgetEntryRowSelectionProvider
      visibleEntryIds={visibleEntryIds}
      bulkActions={selectionBulkActions}
    >
      <section
        className={`${styles.paymentsPanel} ${styles.budgetTablePanel}`}
        aria-label={embeddedInFolderTabs ? b.tableTitle : undefined}
        aria-labelledby={embeddedInFolderTabs ? undefined : 'budget-table-heading'}
      >
        {embeddedInFolderTabs ? (
          <FolderTabToolbarPortal>
            <DetailPanelHeaderActions>
              {filterGhost}
              {searchInput}
              {refreshButton}
              {desktopAddButton}
              <CrmDirectUploadStatusHost />
            </DetailPanelHeaderActions>
          </FolderTabToolbarPortal>
        ) : isMobileLayout ? (
          <div
            className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.detailPanelHeaderRow}>
              <div className={styles.detailPanelHeaderTitleGroup}>
                <h3 id="budget-table-heading" className={styles.detailPanelTitle}>
                  {b.tableTitle}
                </h3>
                {filterCaret}
              </div>
              <div className={styles.detailPanelHeaderRowActions}>
                {refreshButton}
                <BudgetMobileBulkToolbar />
              </div>
            </div>
            <BudgetMobileSearchToolsRow
              searchInput={searchInput}
              trailingActions={mobileAddButton}
            />
          </div>
        ) : (
          <DetailPanelHeader title={b.tableTitle} titleId="budget-table-heading">
            <DetailPanelHeaderActions>
              {searchInput}
              <div className={styles.detailPanelHeaderBtnWrap}>
                <CrmDirectUploadStatusHost />
              </div>
            </DetailPanelHeaderActions>
          </DetailPanelHeader>
        )}

        {!showTable ? (
          <p className={styles.subtitle}>{b.empty}</p>
        ) : isMobileLayout ? (
          <div className={styles.budgetMobileList}>
            <BudgetMobileBulkSelectAllRow />
            {filtered.length === 0 ? <p className={styles.subtitle}>{b.empty}</p> : null}
            {filtered.map((entry) => (
              <BudgetInlineRow
                key={entry.id}
                variant="mobile"
                projectSlug={project.summary.slug}
                entry={entry}
                entryDocuments={project.documents.filter((doc) => doc.budgetEntryId === entry.id)}
                onSave={updateEntry}
                onError={onError}
                onRequestDelete={canDelete ? () => setDeleteConfirmEntry(entry) : undefined}
              />
            ))}
            {draftOpen ? (
              <BudgetDraftRow onSave={handleDraftSave} onCancel={() => setDraftOpen(false)} />
            ) : null}
            <article
              className={`${styles.card} ${styles.workflowTaskMobileCard} ${styles.budgetMobileTotalsCard}`}
            >
              <div className={styles.workflowTaskMobileCardGrid3}>
                <div className={styles.workflowTaskMobileCardCell}>
                  <span className={styles.projectInfoMobileLabel}>{b.totalsLabel}</span>
                  <span className={styles.workflowTaskMobileCardValue}>
                    {formatCentsAsUsd(totals.cost)}
                  </span>
                </div>
                <div
                  className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}
                >
                  <span className={styles.projectInfoMobileLabel}>{b.columns.budget}</span>
                  <span className={styles.workflowTaskMobileCardValue}>
                    {formatCentsAsUsd(totals.budget)}
                  </span>
                </div>
                <div
                  className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}
                >
                  <span className={styles.projectInfoMobileLabel}>{b.columns.remaining}</span>
                  <span
                    className={`${styles.workflowTaskMobileCardValue} ${
                      totals.diff >= 0 ? styles.budgetRemainingUnder : styles.budgetRemainingOver
                    }`}
                  >
                    {formatCentsAsUsd(totals.diff)}
                  </span>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <div className={`${styles.stageGroup_unifiedTableSection} ${styles.budgetStageTableSection}`}>
            <div
              className={`${styles.stageGroupTable} ${styles.stageGroup_accentBorder} ${styles.budgetStageTable}`}
              style={{ ['--stage-accent' as string]: '#d97706' }}
            >
              <BudgetTableHeaderRow
                leadingFilter={embeddedInFolderTabs ? null : filterCaret}
                showStatusRefresh={false}
                rowClassName={styles.stageGroupUnifiedHeaderRow}
                stageHeaderSelect={<BudgetHeaderSelectCell />}
                stageHeaderPrimary={
                  <BudgetHeaderPrimaryCell
                    label={b.tableTitle}
                    collapsed={tableCollapsed}
                    onToggle={() => setTableCollapsed((current) => !current)}
                    itemCount={filtered.length}
                  />
                }
              />
              {!tableCollapsed ? (
                <>
                  {draftOpen ? (
                    <BudgetDraftRow onSave={handleDraftSave} onCancel={() => setDraftOpen(false)} />
                  ) : null}
                  {filtered.length === 0 && !draftOpen ? (
                    <div
                      className={`${styles.tableRow} ${styles.budgetGrid} ${styles.workflowStageEmptyRow}`}
                      role="row"
                    >
                      <span className={styles.workflowSelectCell} aria-hidden />
                      <span className={styles.taskTitleCell}>
                        <span className={styles.workflowStageEmptyMessage}>{b.empty}</span>
                      </span>
                    </div>
                  ) : null}
                  {filtered.map((entry) => (
                    <BudgetInlineRow
                      key={entry.id}
                      projectSlug={project.summary.slug}
                      entry={entry}
                      entryDocuments={project.documents.filter((doc) => doc.budgetEntryId === entry.id)}
                      onSave={updateEntry}
                      onError={onError}
                      onRequestDelete={canDelete ? () => setDeleteConfirmEntry(entry) : undefined}
                    />
                  ))}
                  <div
                    className={`${styles.tableRow} ${styles.budgetGrid} ${styles.budgetTotalsRow}`}
                    role="row"
                  >
                    <span className={styles.workflowSelectCell} aria-hidden />
                    <span className={styles.budgetTotalsLabel}>{b.totalsLabel}</span>
                    <span aria-hidden />
                    <span className={styles.budgetTotalsValue}>{formatCentsAsUsd(totals.cost)}</span>
                    <span className={styles.budgetTotalsValue}>{formatCentsAsUsd(totals.budget)}</span>
                    <span
                      className={`${styles.budgetTotalsValue} ${
                        totals.diff >= 0 ? styles.budgetRemainingUnder : styles.budgetRemainingOver
                      }`}
                    >
                      {formatCentsAsUsd(totals.diff)}
                    </span>
                    <span aria-hidden />
                    <span aria-hidden />
                    <span className={styles.taskDeleteCell} aria-hidden />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteConfirmEntry != null}
          onClose={() => setDeleteConfirmEntry(null)}
          onConfirm={() => void handleConfirmDelete()}
          title={b.deleteItemConfirmTitle}
          message={
            deleteConfirmEntry
              ? `“${deleteConfirmEntry.itemName}” will be removed from this budget.`
              : undefined
          }
          confirmLabel={b.deleteItemConfirmLabel}
          cancelLabel={b.deleteItemCancelLabel}
          variant="danger"
        />
      </section>
    </BudgetEntryRowSelectionProvider>
  );
}
