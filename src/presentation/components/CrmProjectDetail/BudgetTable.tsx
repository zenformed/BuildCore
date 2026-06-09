'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmBudgetEntry } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import {
  BUDGET_TABLE_FILTERS,
  filterBudgetEntries,
  type BudgetTableFilter,
} from '@/presentation/features/crmProjectDetail/budgetFilterModel';
import { useBudgetEntryActions } from '@/presentation/features/crmProjectDetail/useBudgetEntryActions';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { BudgetDraftRow } from './BudgetDraftRow';
import { BudgetInlineRow } from './BudgetInlineRow';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
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
  const [filter, setFilter] = useState<BudgetTableFilter>('all');
  const [draftOpen, setDraftOpen] = useState(false);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<CrmBudgetEntry | null>(null);

  const { createEntry, updateEntry, deleteEntry } = useBudgetEntryActions({
    projectId: project.summary.id,
    projectSlug: project.summary.slug,
    onEntryPatched: handleBudgetEntryPatched,
    onEntryCreated: handleBudgetEntryCreated,
    onEntryDeleted: handleBudgetEntryDeleted,
    onError,
  });

  const filtered = useMemo(
    () => filterBudgetEntries(project.budget.entries, filter),
    [filter, project.budget.entries]
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

  const showTable = filtered.length > 0 || draftOpen;

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEntry) return;
    const entryId = deleteConfirmEntry.id;
    setDeleteConfirmEntry(null);
    await deleteEntry(entryId);
  };

  return (
    <section
      className={`${styles.paymentsPanel} ${styles.budgetTablePanel}`}
      aria-labelledby="budget-table-heading"
    >
      <DetailPanelHeader title={b.tableTitle} titleId="budget-table-heading">
        <DetailPanelHeaderActions>
          <DetailPanelSectionRefresh
            sectionLabel={b.tableTitle}
            onRefresh={refreshBudgetSection}
            onError={(message) => setToast({ kind: 'error', message })}
          />
          {canCreate ? (
            <DetailPanelHeaderButton
              variant="add"
              disabled={draftOpen}
              title={b.addItem}
              onClick={() => setDraftOpen(true)}
            />
          ) : null}
        </DetailPanelHeaderActions>
      </DetailPanelHeader>

      <div className={styles.docFilterRow} role="tablist" aria-label={b.filterAriaLabel}>
        {BUDGET_TABLE_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? styles.docFilterTab_active : styles.docFilterTab}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!showTable ? (
        <p className={styles.subtitle}>{b.empty}</p>
      ) : (
        <div className={styles.paymentsList}>
          <div
            className={`${styles.tableHeader} ${styles.budgetGrid} ${styles.budgetTableHeader}`}
            role="row"
          >
            <span role="columnheader">{b.columns.itemName}</span>
            <span role="columnheader">{b.columns.category}</span>
            <span role="columnheader">{b.columns.cost}</span>
            <span role="columnheader">{b.columns.budget}</span>
            <span role="columnheader">{b.columns.remaining}</span>
            <span role="columnheader">{b.columns.costDate}</span>
            <span role="columnheader">{b.columns.documents}</span>
            <span role="columnheader" className={styles.taskDeleteHeader} aria-hidden />
          </div>
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
          {draftOpen ? (
            <BudgetDraftRow
              onSave={async (draft) => {
                await createEntry(draft);
                setDraftOpen(false);
              }}
              onCancel={() => setDraftOpen(false)}
            />
          ) : null}
          <div
            className={`${styles.tableRow} ${styles.budgetGrid} ${styles.budgetTotalsRow}`}
            role="row"
          >
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
