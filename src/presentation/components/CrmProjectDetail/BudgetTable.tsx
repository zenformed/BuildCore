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
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import styles from './ProjectDetail.module.css';

export type BudgetTableProps = {
  onError: (message: string) => void;
};

export function BudgetTable({ onError }: BudgetTableProps): ReactElement {
  const {
    project,
    handleBudgetEntryPatched,
    handleBudgetEntryCreated,
    handleBudgetEntryDeleted,
    refreshBudgetSection,
    setToast,
  } = useProjectDetailShell();
  const { budget: budgetAccess } = useBuildCoreProjectSectionAccess();
  const { permissions, isReady } = budgetAccess;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete;
  const b = content.projectDetail.budget;
  const [filters, setFilters] = useState<BudgetListFilters>(EMPTY_BUDGET_LIST_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<CrmBudgetEntry | null>(null);
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
    <DetailPanelHeaderButton
      variant="add"
      disabled={draftOpen}
      title={b.addItem}
      onClick={() => setDraftOpen(true)}
    />
  ) : null;

  const filterCaret = (
    <BudgetCategoryFilterMenu
      filters={filters}
      onChange={setFilters}
      triggerVariant="caret"
      menuAlign="start"
    />
  );

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
    <section
      className={`${styles.paymentsPanel} ${styles.budgetTablePanel}`}
      aria-labelledby="budget-table-heading"
    >
      {isMobileLayout ? (
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
            <div className={styles.detailPanelHeaderRowActions}>{refreshButton}</div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>{mobileAddButton}</div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader title={b.tableTitle} titleId="budget-table-heading">
          <DetailPanelHeaderActions>{searchInput}</DetailPanelHeaderActions>
        </DetailPanelHeader>
      )}

      {!showTable ? (
        <p className={styles.subtitle}>{b.empty}</p>
      ) : isMobileLayout ? (
        <div className={styles.budgetMobileList}>
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
        <BudgetEntryRowSelectionProvider
          visibleEntryIds={visibleEntryIds}
          bulkActions={selectionBulkActions}
        >
          <div className={styles.detailPanelTableCard}>
            <div className={styles.paymentsList}>
              <BudgetTableHeaderRow leadingFilter={filterCaret} />
              {draftOpen ? (
                <BudgetDraftRow onSave={handleDraftSave} onCancel={() => setDraftOpen(false)} />
              ) : canCreate ? (
                <button
                  type="button"
                  className={`${styles.budgetAddPromptRow} ${styles.budgetGrid} ${styles.budgetDraftSwap}`}
                  onClick={() => setDraftOpen(true)}
                >
                  <span className={styles.budgetAddPromptLabel}>
                    <span className={styles.budgetAddPromptPlusBtn} aria-hidden>
                      +
                    </span>
                    {b.addItemRowLabel}
                  </span>
                </button>
              ) : null}
              {filtered.length === 0 && !draftOpen ? (
                <div className={`${styles.tableRow} ${styles.budgetGrid}`} role="row">
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
            </div>
          </div>
        </BudgetEntryRowSelectionProvider>
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
  );
}
