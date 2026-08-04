'use client';

import type { ReactElement, ReactNode } from 'react';
import { LuFileSpreadsheet, LuSearch } from 'react-icons/lu';
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
  bulkToolbarAriaLabel = '',
  bulkCancelLabel = '',
  onClearSelection,
  mobileBulkActions = null,
  trailingActions = null,
}: SubprojectsListToolbarProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();

  return (
    <>
      {showMobileBulkToolbar ? (
        <div className={styles.subprojectsMobileSelectionLayout}>
          <div
            className={styles.subprojectsMobileBulkToolbar}
            role="toolbar"
            aria-label={bulkToolbarAriaLabel}
          >
            {mobileBulkActions}
          </div>
        </div>
      ) : expanded ? (
        isMobileLayout ? (
          <div className={styles.subprojectsMobileSearchRow}>
            <div className={styles.subprojectsSearchFieldWrap}>
              <LuSearch className={styles.subprojectsSearchIcon} size={14} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchAriaLabel}
                className={`${styles.subprojectsSearch} ${styles.subprojectsSearch_withIcon}`}
              />
            </div>
            {trailingActions}
          </div>
        ) : (
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className={styles.subprojectsSearch}
          />
        )
      ) : null}
      {!showMobileBulkToolbar && !isMobileLayout && canManage && onImportOpen ? (
        <button
          type="button"
          className={importStyles.toolbarImportButton}
          title={importSpreadsheetTitle}
          aria-label={importSpreadsheetAriaLabel ?? importSpreadsheetTitle}
          onClick={onImportOpen}
        >
          <LuFileSpreadsheet size={16} strokeWidth={2} aria-hidden />
          {isMobileLayout ? null : importSpreadsheetTitle}
        </button>
      ) : null}
      {!showMobileBulkToolbar && !isMobileLayout ? trailingActions : null}
      {!showMobileBulkToolbar && !isMobileLayout && canManage ? (
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
