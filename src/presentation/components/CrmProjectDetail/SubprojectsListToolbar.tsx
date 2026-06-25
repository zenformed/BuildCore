'use client';

import type { ReactElement } from 'react';
import type { BulkSelectionToolbarAction } from '@/presentation/components/BulkSelection';
import { BulkSelectionToolbar } from '@/presentation/components/BulkSelection';
import bulkSelectionStyles from '@/presentation/components/BulkSelection/BulkSelection.module.css';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import { SelectItemsIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
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
  readonly canUseBulkActions: boolean;
  readonly selectLabel: string;
  readonly onEnterSelectionMode: () => void;
  readonly listFilters: CrmProjectsListFilters;
  readonly onListFiltersChange: (filters: CrmProjectsListFilters) => void;
  readonly radiusFilter: RadiusFilterState;
  readonly onRadiusFilterChange: (filter: RadiusFilterState) => void;
  readonly selectionMode?: boolean;
  readonly selectedCount?: number;
  readonly selectedCountLabel?: string;
  readonly bulkToolbarAriaLabel?: string;
  readonly bulkCancelLabel?: string;
  readonly onExitSelectionMode?: () => void;
  readonly bulkActions?: readonly BulkSelectionToolbarAction[];
  readonly bulkActionsLayout?: 'inline' | 'menu';
  readonly bulkActionsMenuAriaLabel?: string;
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
  canUseBulkActions,
  selectLabel,
  onEnterSelectionMode,
  listFilters,
  onListFiltersChange,
  radiusFilter,
  onRadiusFilterChange,
  selectionMode = false,
  selectedCount = 0,
  selectedCountLabel = '',
  bulkToolbarAriaLabel = '',
  bulkCancelLabel = '',
  onExitSelectionMode,
  bulkActions = [],
  bulkActionsLayout = 'inline',
  bulkActionsMenuAriaLabel,
}: SubprojectsListToolbarProps): ReactElement {
  if (selectionMode && canUseBulkActions) {
    return (
      <BulkSelectionToolbar
        variant="header"
        className={
          isMobileLayout ? bulkSelectionStyles.bulkSelectionToolbar_headerStacked : undefined
        }
        selectedCount={selectedCount}
        selectedCountLabel={selectedCountLabel}
        ariaLabel={bulkToolbarAriaLabel}
        cancelLabel={bulkCancelLabel}
        onCancel={onExitSelectionMode ?? (() => undefined)}
        actions={bulkActions}
        actionsLayout={bulkActionsLayout}
        actionsMenuAriaLabel={bulkActionsMenuAriaLabel ?? bulkToolbarAriaLabel}
      />
    );
  }

  return (
    <>
      {expanded ? (
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
      <DetailPanelSectionRefresh
        sectionLabel={sectionLabel}
        onRefresh={onRefresh}
        onError={onRefreshError}
      />
      {canUseBulkActions ? (
        <button
          type="button"
          className={styles.subprojectsSelectBtn}
          title={selectLabel}
          aria-label={selectLabel}
          onClick={onEnterSelectionMode}
        >
          <SelectItemsIcon className={styles.subprojectsSelectBtnIcon} />
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
