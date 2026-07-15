'use client';

import type { ReactElement, ReactNode } from 'react';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import type { CrmProjectsListFilters } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import type { RadiusFilterState } from '@/presentation/features/filters/radiusFilterModel';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import styles from './ProjectDetail.module.css';

export type SubprojectsListToolbarProps = {
  readonly expanded: boolean;
  readonly isMobileLayout: boolean;
  readonly searchQuery: string;
  readonly searchPlaceholder: string;
  readonly searchAriaLabel: string;
  readonly onSearchQueryChange: (value: string) => void;
  readonly sectionLabel: string;
  readonly onRefresh: () => Promise<void>;
  readonly onRefreshError: (message: string) => void;
  readonly canManage: boolean;
  readonly newSubprojectTitle: string;
  readonly newSubprojectAriaLabel: string;
  readonly onCreateOpen: () => void;
  readonly listFilters: CrmProjectsListFilters;
  readonly onListFiltersChange: (filters: CrmProjectsListFilters) => void;
  readonly radiusFilter: RadiusFilterState;
  readonly onRadiusFilterChange: (filter: RadiusFilterState) => void;
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
  isMobileLayout,
  searchQuery,
  searchPlaceholder,
  searchAriaLabel,
  onSearchQueryChange,
  sectionLabel,
  onRefresh,
  onRefreshError,
  canManage,
  newSubprojectTitle,
  newSubprojectAriaLabel,
  onCreateOpen,
  listFilters,
  onListFiltersChange,
  radiusFilter,
  onRadiusFilterChange,
  showMobileBulkToolbar = false,
  selectedCountLabel = '',
  bulkToolbarAriaLabel = '',
  bulkCancelLabel = '',
  onClearSelection,
  mobileBulkActions = null,
  trailingActions = null,
}: SubprojectsListToolbarProps): ReactElement {
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
      {expanded && isMobileLayout ? (
        <CrmProjectsFilterMenu
          filters={listFilters}
          onChange={onListFiltersChange}
          stageScopeMode="subproject"
          radiusFilter={radiusFilter}
          onRadiusFilterChange={onRadiusFilterChange}
        />
      ) : null}
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
      {expanded && isMobileLayout ? (
        <DetailPanelSectionRefresh
          sectionLabel={sectionLabel}
          onRefresh={onRefresh}
          onError={onRefreshError}
        />
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
    </>
  );
}
