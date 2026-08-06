'use client';

import type { ReactElement, ReactNode } from 'react';
import { LuFileSpreadsheet, LuSearch } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelHeaderMoreMenu } from './DetailPanelHeaderMoreMenu';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import projectsStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
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
  /** When set, Refresh appears in the ⋮ menu after the green + button. */
  readonly onRefresh?: () => Promise<void>;
  readonly onRefreshError?: (message: string) => void;
  readonly refreshSectionLabel?: string;
  /** Mobile: show bulk chrome when rows are selected. */
  readonly showMobileBulkToolbar?: boolean;
  readonly bulkToolbarAriaLabel?: string;
  readonly bulkCancelLabel?: string;
  readonly onClearSelection?: () => void;
  readonly mobileBulkActions?: ReactNode;
  /** Mobile: filter (etc.) beside search. Desktop refresh/import live in the ⋮ menu. */
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
  onRefresh,
  onRefreshError,
  refreshSectionLabel,
  showMobileBulkToolbar = false,
  bulkToolbarAriaLabel = '',
  bulkCancelLabel: _bulkCancelLabel = '',
  onClearSelection: _onClearSelection,
  mobileBulkActions = null,
  trailingActions = null,
}: SubprojectsListToolbarProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const panelCopy = content.crm.panel;
  const showImport = canManage && onImportOpen != null;
  const showRefresh = onRefresh != null;
  const showMoreMenu = !isMobileLayout && (showImport || showRefresh);
  const sectionLabel = refreshSectionLabel ?? content.projectDetail.subprojects.title;

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
      {!showMobileBulkToolbar && !isMobileLayout && (canManage || showMoreMenu) ? (
        <div className={projectsStyles.desktopCreateActions}>
          {canManage ? (
            <DetailPanelHeaderButton
              variant="add"
              title={newSubprojectTitle}
              aria-label={newSubprojectAriaLabel}
              onClick={onCreateOpen}
            />
          ) : null}
          {showMoreMenu ? (
            <DetailPanelHeaderMoreMenu
              refreshAction={
                showRefresh && onRefresh != null
                  ? {
                      sectionLabel,
                      onRefresh,
                      onError: onRefreshError,
                    }
                  : null
              }
            >
              {showImport ? (
                <button
                  type="button"
                  role="menuitem"
                  className={projectsStyles.rowActionsMenuItem}
                  aria-label={importSpreadsheetAriaLabel ?? panelCopy.importSpreadsheetAriaLabel}
                  onClick={() => {
                    onImportOpen?.();
                  }}
                >
                  <span
                    className={[
                      projectsStyles.rowActionsMenuIconTile,
                      projectsStyles.rowActionsMenuIconTile_import,
                    ].join(' ')}
                    aria-hidden
                  >
                    <LuFileSpreadsheet size={15} strokeWidth={2.25} />
                  </span>
                  {panelCopy.importSpreadsheetMenu}
                </button>
              ) : null}
            </DetailPanelHeaderMoreMenu>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
