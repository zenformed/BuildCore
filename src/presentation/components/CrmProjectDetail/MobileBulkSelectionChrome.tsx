'use client';

import type { ReactElement, ReactNode } from 'react';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection';
import { useBudgetEntryRowSelection } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { BudgetTableBulkActions } from './BudgetTableBulkActions';
import { DocumentsPanelBulkActions } from './DocumentsPanelBulkActions';
import { WorkflowTableBulkActions } from './WorkflowTableBulkActions';
import styles from './ProjectDetail.module.css';

export type MobileBulkSelectAllRowProps = {
  readonly allVisibleSelected: boolean;
  readonly someVisibleSelected: boolean;
  readonly selectAllAriaLabel: string;
  readonly onToggleAllVisible: () => void;
};

/** Select-all row above mobile card lists (matches subprojects). */
export function MobileBulkSelectAllRow({
  allVisibleSelected,
  someVisibleSelected,
  selectAllAriaLabel,
  onToggleAllVisible,
}: MobileBulkSelectAllRowProps): ReactElement {
  return (
    <div className={styles.subprojectsMobileSelectAllRow}>
      <BulkSelectCheckbox
        className={styles.subprojectsMobileSelectAllCheckbox}
        checked={allVisibleSelected}
        indeterminate={someVisibleSelected}
        ariaLabel={selectAllAriaLabel}
        onChange={onToggleAllVisible}
      />
      <span className={styles.subprojectsMobileSelectAllLabel}>{selectAllAriaLabel}</span>
    </div>
  );
}

export type MobileBulkSelectionToolbarProps = {
  readonly selectedCountLabel: string;
  readonly toolbarAriaLabel: string;
  readonly cancelLabel: string;
  readonly onClearSelection: () => void;
  readonly actions: ReactNode;
};

/**
 * Bulk count + actions + cancel.
 * Rendered in the top header actions row after refresh (matches subprojects).
 */
export function MobileBulkSelectionToolbar({
  selectedCountLabel,
  toolbarAriaLabel,
  cancelLabel,
  onClearSelection,
  actions,
}: MobileBulkSelectionToolbarProps): ReactElement {
  return (
    <div
      className={styles.subprojectsMobileBulkToolbar}
      role="toolbar"
      aria-label={toolbarAriaLabel}
    >
      <span className={styles.subprojectsMobileBulkCount}>{selectedCountLabel}</span>
      {actions}
      <button
        type="button"
        className={styles.workflowBulkActionBtn}
        aria-label={cancelLabel}
        title={cancelLabel}
        onClick={onClearSelection}
      >
        <CloseIcon className={styles.workflowBulkActionGlyph} />
      </button>
    </div>
  );
}

function useWorkflowMobileBulkSelection(): {
  readonly showBulkToolbar: boolean;
  readonly selectedCount: number;
  readonly clearSelection: () => void;
} {
  const { isMemberRole } = useProjectDetailShell();
  const rowSelection = useWorkflowTaskRowSelection();
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const showBulkToolbar = !isMemberRole && rowSelection != null && selectedCount > 0;
  return {
    showBulkToolbar,
    selectedCount,
    clearSelection: () => rowSelection?.clearSelection(),
  };
}

function useBudgetMobileBulkSelection(): {
  readonly showBulkToolbar: boolean;
  readonly selectedCount: number;
  readonly clearSelection: () => void;
} {
  const rowSelection = useBudgetEntryRowSelection();
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const showBulkToolbar = rowSelection != null && selectedCount > 0;
  return {
    showBulkToolbar,
    selectedCount,
    clearSelection: () => rowSelection?.clearSelection(),
  };
}

/** Workflow / payments mobile: select-all row (requires selection provider ancestor). */
export function WorkflowMobileBulkSelectAllRow(): ReactElement | null {
  const { isMemberRole } = useProjectDetailShell();
  const rowSelection = useWorkflowTaskRowSelection();
  if (isMemberRole || rowSelection == null) return null;
  return (
    <MobileBulkSelectAllRow
      allVisibleSelected={rowSelection.allVisibleSelected}
      someVisibleSelected={rowSelection.someVisibleSelected}
      selectAllAriaLabel={rowSelection.selectAllAriaLabel}
      onToggleAllVisible={() => rowSelection.onToggleAllVisible()}
    />
  );
}

/**
 * Workflow / payments: bulk toolbar for the top header actions row (after refresh).
 * Returns null when nothing is selected.
 */
export function WorkflowMobileBulkToolbar(): ReactElement | null {
  const bulkCopy = content.bulkSelection;
  const { showBulkToolbar, selectedCount, clearSelection } = useWorkflowMobileBulkSelection();
  if (!showBulkToolbar) return null;
  return (
    <MobileBulkSelectionToolbar
      selectedCountLabel={bulkCopy.selectedCount(selectedCount)}
      toolbarAriaLabel={bulkCopy.toolbarAriaLabel}
      cancelLabel={bulkCopy.cancel}
      onClearSelection={clearSelection}
      actions={<WorkflowTableBulkActions />}
    />
  );
}

/**
 * Workflow / payments: search + add row.
 * Hidden while bulk toolbar is active (same swap as subprojects tools row).
 */
export function WorkflowMobileSearchToolsRow({
  searchInput,
  trailingActions = null,
}: {
  readonly searchInput: ReactNode;
  readonly trailingActions?: ReactNode;
}): ReactElement | null {
  const { showBulkToolbar } = useWorkflowMobileBulkSelection();
  if (showBulkToolbar) return null;
  return (
    <div className={styles.detailPanelHeaderRow}>
      <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
      {trailingActions != null ? (
        <div className={styles.detailPanelHeaderRowActions}>{trailingActions}</div>
      ) : null}
    </div>
  );
}

/** Budget mobile: select-all row (requires selection provider ancestor). */
export function BudgetMobileBulkSelectAllRow(): ReactElement | null {
  const rowSelection = useBudgetEntryRowSelection();
  if (rowSelection == null) return null;
  return (
    <MobileBulkSelectAllRow
      allVisibleSelected={rowSelection.allVisibleSelected}
      someVisibleSelected={rowSelection.someVisibleSelected}
      selectAllAriaLabel={rowSelection.selectAllAriaLabel}
      onToggleAllVisible={() => rowSelection.onToggleAllVisible()}
    />
  );
}

/**
 * Budget: bulk toolbar for the top header actions row (after refresh).
 * Returns null when nothing is selected.
 */
export function BudgetMobileBulkToolbar(): ReactElement | null {
  const bulkCopy = content.bulkSelection;
  const { showBulkToolbar, selectedCount, clearSelection } = useBudgetMobileBulkSelection();
  if (!showBulkToolbar) return null;
  return (
    <MobileBulkSelectionToolbar
      selectedCountLabel={bulkCopy.selectedCount(selectedCount)}
      toolbarAriaLabel={bulkCopy.toolbarAriaLabel}
      cancelLabel={bulkCopy.cancel}
      onClearSelection={clearSelection}
      actions={<BudgetTableBulkActions />}
    />
  );
}

/**
 * Budget: search + add row.
 * Hidden while bulk toolbar is active (same swap as subprojects tools row).
 */
export function BudgetMobileSearchToolsRow({
  searchInput,
  trailingActions = null,
}: {
  readonly searchInput: ReactNode;
  readonly trailingActions?: ReactNode;
}): ReactElement | null {
  const { showBulkToolbar } = useBudgetMobileBulkSelection();
  if (showBulkToolbar) return null;
  return (
    <div className={styles.detailPanelHeaderRow}>
      <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
      {trailingActions != null ? (
        <div className={styles.detailPanelHeaderRowActions}>{trailingActions}</div>
      ) : null}
    </div>
  );
}

function useDocumentsMobileBulkSelection(): {
  readonly showBulkToolbar: boolean;
  readonly selectedCount: number;
  readonly clearSelection: () => void;
} {
  const rowSelection = useDocumentRowSelection();
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const showBulkToolbar = rowSelection != null && selectedCount > 0;
  return {
    showBulkToolbar,
    selectedCount,
    clearSelection: () => rowSelection?.clearSelection(),
  };
}

/** Documents mobile: select-all row (requires selection provider ancestor). */
export function DocumentsMobileBulkSelectAllRow(): ReactElement | null {
  const rowSelection = useDocumentRowSelection();
  if (rowSelection == null) return null;
  return (
    <MobileBulkSelectAllRow
      allVisibleSelected={rowSelection.allVisibleSelected}
      someVisibleSelected={rowSelection.someVisibleSelected}
      selectAllAriaLabel={rowSelection.selectAllAriaLabel}
      onToggleAllVisible={() => rowSelection.onToggleAllVisible()}
    />
  );
}

/** Documents: bulk toolbar for the top header actions row (after refresh). */
export function DocumentsMobileBulkToolbar(): ReactElement | null {
  const bulkCopy = content.bulkSelection;
  const { showBulkToolbar, selectedCount, clearSelection } = useDocumentsMobileBulkSelection();
  if (!showBulkToolbar) return null;
  return (
    <MobileBulkSelectionToolbar
      selectedCountLabel={bulkCopy.selectedCount(selectedCount)}
      toolbarAriaLabel={bulkCopy.toolbarAriaLabel}
      cancelLabel={bulkCopy.cancel}
      onClearSelection={clearSelection}
      actions={<DocumentsPanelBulkActions />}
    />
  );
}

/**
 * Documents: search + upload row.
 * Hidden while bulk toolbar is active (same swap as subprojects tools row).
 */
export function DocumentsMobileSearchToolsRow({
  searchInput,
  trailingActions = null,
}: {
  readonly searchInput: ReactNode;
  readonly trailingActions?: ReactNode;
}): ReactElement | null {
  const { showBulkToolbar } = useDocumentsMobileBulkSelection();
  if (showBulkToolbar) return null;
  return (
    <div className={styles.detailPanelHeaderRow}>
      <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
      {trailingActions != null ? (
        <div className={styles.detailPanelHeaderRowActions}>{trailingActions}</div>
      ) : null}
    </div>
  );
}

