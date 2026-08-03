'use client';

import type { ReactElement, ReactNode } from 'react';
import { LuFileSpreadsheet } from 'react-icons/lu';
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
  readonly selectedCount?: number;
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
  selectedCount = 0,
  bulkToolbarAriaLabel = '',
  bulkCancelLabel = '',
  onClearSelection,
  mobileBulkActions = null,
  trailingActions = null,
}: SubprojectsListToolbarProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const selectedCountDisplay = selectedCount > 99 ? '99+' : String(Math.max(0, selectedCount));

  return (
    <>
      {showMobileBulkToolbar ? (
        <div className={styles.subprojectsMobileSelectionLayout}>
          <div
            className={styles.subprojectsMobileBulkToolbar}
            role="toolbar"
            aria-label={bulkToolbarAriaLabel}
          >
            <button
              type="button"
              className={styles.subprojectsSelectBtn}
              aria-label={bulkCancelLabel}
              title={`${selectedCountDisplay} selected`}
              onClick={onClearSelection}
            >
              <span className={styles.subprojectsSelectBtnIcon} aria-hidden>
                {selectedCountDisplay}
              </span>
            </button>
            {mobileBulkActions}
          </div>
          <div className={styles.subprojectsMobileSelectionRightActions}>
            {canManage && onImportOpen ? (
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
            {trailingActions}
            {canManage ? (
              <DetailPanelHeaderButton
                variant="add"
                title={newSubprojectTitle}
                aria-label={newSubprojectAriaLabel}
                onClick={onCreateOpen}
              />
            ) : null}
          </div>
        </div>
      ) : expanded ? (
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          className={styles.subprojectsSearch}
        />
      ) : null}
      {!showMobileBulkToolbar && canManage && onImportOpen ? (
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
      {!showMobileBulkToolbar ? trailingActions : null}
      {!showMobileBulkToolbar && canManage ? (
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
