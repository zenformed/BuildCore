'use client';

import type { ReactElement, ReactNode } from 'react';
import { LuFileSpreadsheet } from 'react-icons/lu';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import importStyles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';
import styles from './ProjectDetail.module.css';

export type SubprojectsListToolbarProps = {
  readonly expanded: boolean;
  readonly searchQuery: string;
  readonly searchPlaceholder: string;
  readonly searchAriaLabel: string;
  readonly onSearchQueryChange: (value: string) => void;
  readonly canManage: boolean;
  readonly newSubprojectTitle: string;
  readonly newSubprojectAriaLabel: string;
  readonly onCreateOpen: () => void;
  readonly importSpreadsheetTitle?: string;
  readonly importSpreadsheetAriaLabel?: string;
  readonly onImportOpen?: () => void;
  /** Mobile: show bulk chrome when rows are selected. */
  readonly showMobileBulkToolbar?: boolean;
  readonly selectedCountLabel?: string;
  readonly bulkToolbarAriaLabel?: string;
  readonly bulkCancelLabel?: string;
  readonly onClearSelection?: () => void;
  readonly mobileBulkActions?: ReactNode;
  readonly trailingActions?: ReactNode;
};

export function SubprojectsListToolbar({
  expanded,
  searchQuery,
  searchPlaceholder,
  searchAriaLabel,
  onSearchQueryChange,
  canManage,
  newSubprojectTitle,
  newSubprojectAriaLabel,
  onCreateOpen,
  importSpreadsheetTitle,
  importSpreadsheetAriaLabel,
  onImportOpen,
  showMobileBulkToolbar = false,
  selectedCountLabel = '',
  bulkToolbarAriaLabel = '',
  bulkCancelLabel = '',
  onClearSelection,
  mobileBulkActions = null,
  trailingActions = null,
}: SubprojectsListToolbarProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();

  if (showMobileBulkToolbar) {
    return (
      <div
        className={styles.subprojectsMobileBulkToolbar}
        role="toolbar"
        aria-label={bulkToolbarAriaLabel}
      >
        <span className={styles.subprojectsMobileBulkCount}>{selectedCountLabel}</span>
        {mobileBulkActions}
        <button
          type="button"
          className={styles.workflowBulkActionBtn}
          aria-label={bulkCancelLabel}
          title={bulkCancelLabel}
          onClick={onClearSelection}
        >
          <CloseIcon className={styles.workflowBulkActionGlyph} />
        </button>
      </div>
    );
  }

  return (
    <>
      {expanded ? (
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          className={styles.subprojectsSearch}
        />
      ) : null}
      {trailingActions}
      {canManage && onImportOpen ? (
        <button
          type="button"
          className={
            isMobileLayout
              ? importStyles.toolbarIconButton
              : importStyles.toolbarSecondaryButton
          }
          title={importSpreadsheetTitle}
          aria-label={importSpreadsheetAriaLabel ?? importSpreadsheetTitle}
          onClick={onImportOpen}
        >
          {isMobileLayout ? (
            <LuFileSpreadsheet size={16} strokeWidth={2} aria-hidden />
          ) : (
            importSpreadsheetTitle
          )}
        </button>
      ) : null}
      {canManage ? (
        <DetailPanelHeaderButton
          variant="add"
          title={newSubprojectTitle}
          aria-label={newSubprojectAriaLabel}
          onClick={onCreateOpen}
        />
      ) : null}
    </>
  );
}
