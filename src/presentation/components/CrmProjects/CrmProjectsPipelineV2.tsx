'use client';

/**
 * Dashboard Projects list v2 path (Phase 1B).
 * Used only when NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2=true.
 * Does not fetch org-wide rollup Maps.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { LuChevronLeft, LuChevronRight, LuSearch } from 'react-icons/lu';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  isCrmProjectComplete,
  isCrmProjectInactive,
  type CrmProjectSummary,
} from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  CRM_PROJECTS_LIST_V2_PAGE_SIZES,
  type CrmProjectsListV2PageSize,
  type CrmProjectsListV2RootListItem,
} from '@/domain/crm/projectsListV2';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { resolveCrmProjectsTableEmptyMessage } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { consumeCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { SubprojectsTableBulkActions } from '@/presentation/components/CrmProjectDetail/SubprojectsTableBulkActions';
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { SpreadsheetImportWizard } from '@/presentation/components/CrmImport/SpreadsheetImportWizard';
import { SpreadsheetImportMobileNoticeDialog } from '@/presentation/components/CrmImport/SpreadsheetImportMobileNoticeDialog';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectsBulkStatusChange } from '@/presentation/features/crmProjects/useCrmProjectsBulkStatusChange';
import { assignCrmProjectMember } from '@/presentation/features/crmProjects/assignCrmProjectMember';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import {
  useAssignmentIdentityCatalog,
  useAssignmentIdentityState,
} from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useCrmProjectsListV2Dashboard } from '@/presentation/features/crmProjects/listV2/useCrmProjectsListV2Dashboard';
import { CrmProjectsDesktopCreateActions } from './CrmProjectsDesktopCreateActions';
import { CrmProjectsFilterMenu } from './CrmProjectsFilterMenu';
import { CrmProjectsBulkStatusDialogs } from './CrmProjectsBulkStatusDialogs';
import { CrmProjectsTable } from './CrmProjectsTable';
import { CrmProjectsMobileList } from './CrmProjectsMobileList';
import styles from './CrmProjects.module.css';

export type CrmProjectsPipelineV2Props = {
  onProjectRowClick: (project: CrmProjectSummary) => void;
  onProjectCreated?: () => void | Promise<void>;
};

type PipelineToast = { kind: 'success' | 'error'; message: string };

export function CrmProjectsPipelineV2({
  onProjectRowClick,
  onProjectCreated,
}: CrmProjectsPipelineV2Props): ReactElement {
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const panelCopy = content.crm.panel;
  const bulkSelectionCopy = content.bulkSelection;
  const { organizationMembershipContext } = useSaaSProfile();
  const organizationId = organizationMembershipContext?.organizationId ?? '';
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const isMobileLayout = useDashboardMobileLayout();
  const isApiSource = getCrmDataSource() === 'api';
  const dash = useBuildCoreDashboardContext();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const { isLoading: identitiesLoading } = useAssignmentIdentityState();
  const bulkSelection = useBulkSelection<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMobileNoticeOpen, setImportMobileNoticeOpen] = useState(false);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [toast, setToast] = useState<PipelineToast | null>(null);

  const list = useCrmProjectsListV2Dashboard({ organizationId });
  const rootRows = list.items;
  const listIsLoading = list.isLoading;
  const childCountByParentId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of list.items) {
      const fromSummary = list.pageSummariesById.get(item.id)?.childCount;
      map.set(item.id, fromSummary ?? item.childCount);
    }
    return map;
  }, [list.items, list.pageSummariesById]);

  const {
    pendingDeleteProject,
    setPendingDeleteProject,
    deletingProjectId,
    canDelete,
    handleConfirmDelete,
  } = useCrmProjectDeleteConfirmation({
    onProjectDeleted: list.removeProjectLocally,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const patchAsRootItem = useCallback(
    (summary: CrmProjectSummary) => {
      const existing = list.items.find((item) => item.id === summary.id);
      const next: CrmProjectsListV2RootListItem = {
        ...summary,
        childCount: existing?.childCount ?? list.pageSummariesById.get(summary.id)?.childCount ?? 0,
      };
      list.patchProjectSummaryLocally(next);
    },
    [list]
  );

  const { busyProjectId, togglePriority } = useCrmProjectTableRowActions({
    onProjectUpdated: patchAsRootItem,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });


  const bulkStatusChange = useCrmProjectsBulkStatusChange({
    onProjectsUpdated: () => {
      void list.refetch();
      bulkSelection.clearSelection();
    },
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const visibleIds = useMemo(() => rootRows.map((project) => project.id), [rootRows]);
  const selectedProjects = useMemo(
    () => rootRows.filter((project) => bulkSelection.selectedIds.has(project.id)),
    [bulkSelection.selectedIds, rootRows]
  );
  const selectedPriorityEligible = useMemo(
    () =>
      selectedProjects.filter(
        (project) => !isCrmProjectComplete(project) && !isCrmProjectInactive(project)
      ),
    [selectedProjects]
  );
  const canUseBulkActions = canDelete && !isMemberRole;
  const assigneeOptions = useMemo(
    () => getCrmProjectAssigneeOptions(isApiSource, assignmentCatalog, dash.user?.id),
    [assignmentCatalog, dash.user?.id, isApiSource]
  );

  // Select All = visible page only; preserve selections on other pages.
  const bulkSelectionBindings = useMemo<BulkSelectionBindings | undefined>(() => {
    if (!canUseBulkActions) return undefined;
    return {
      mode: true,
      selectedIds: bulkSelection.selectedIds,
      onToggle: bulkSelection.toggle,
      allVisibleSelected: bulkSelection.allVisibleSelected(visibleIds),
      someVisibleSelected: bulkSelection.someVisibleSelected(visibleIds),
      onToggleAllVisible: () => {
        if (bulkSelection.allVisibleSelected(visibleIds)) {
          bulkSelection.deselectMany(visibleIds);
        } else {
          bulkSelection.selectMany(visibleIds);
        }
      },
      selectItemAriaLabel: bulkSelectionCopy.selectItemAriaLabel,
      selectAllAriaLabel: bulkSelectionCopy.selectAllAriaLabel,
    };
  }, [
    bulkSelection,
    bulkSelectionCopy.selectAllAriaLabel,
    bulkSelectionCopy.selectItemAriaLabel,
    canUseBulkActions,
    visibleIds,
  ]);

  const handleBulkMakePriority = useCallback(async () => {
    if (selectedPriorityEligible.length === 0 || bulkActionBusy) return;
    setBulkActionBusy(true);
    try {
      for (const project of selectedPriorityEligible) {
        await togglePriority(project);
      }
      bulkSelection.clearSelection();
    } finally {
      setBulkActionBusy(false);
    }
  }, [bulkActionBusy, bulkSelection, selectedPriorityEligible, togglePriority]);

  const handleBulkAssign = useCallback(
    async (assignedMemberId: string) => {
      if (selectedProjects.length === 0 || bulkActionBusy) return;
      setBulkActionBusy(true);
      const tableCopy = content.crm.table;
      let updatedCount = 0;
      try {
        for (const selected of selectedProjects) {
          try {
            const updated = await assignCrmProjectMember(selected, assignedMemberId);
            if (updated == null) continue;
            patchAsRootItem(updated);
            updatedCount += 1;
          } catch {
            // Continue remaining selections.
          }
        }
        if (updatedCount > 0) {
          setToast({
            kind: 'success',
            message: tableCopy.multiAssignSuccess(updatedCount),
          });
          bulkSelection.clearSelection();
        } else {
          setToast({ kind: 'error', message: tableCopy.multiAssignFailed });
        }
      } finally {
        setBulkActionBusy(false);
      }
    },
    [bulkActionBusy, bulkSelection, patchAsRootItem, selectedProjects]
  );

  useEffect(() => {
    const message = consumeCrmProjectDeleteSuccessToast();
    if (message) setToast({ kind: 'success', message });
  }, []);

  useEffect(() => {
    if (list.errorMessage != null) {
      setToast({ kind: 'error', message: list.errorMessage });
    }
  }, [list.errorMessage]);

  useEffect(() => {
    if (isMemberRole && createOpen) setCreateOpen(false);
  }, [createOpen, isMemberRole]);

  const handleProjectCreated = async (): Promise<void> => {
    await list.refetch();
    setCreateOpen(false);
    await onProjectCreated?.();
  };

  const handleSubprojectRowClick = useCallback(
    (parent: CrmProjectSummary, child: CrmProjectSummary) => {
      router.push(nav.routes.projectSubDetail(parent.slug, child.slug));
    },
    [nav.routes, router]
  );

  const tableEmptyMessage = resolveCrmProjectsTableEmptyMessage({
    isMemberRole,
    totalProjectCount: list.totalCount ?? 0,
    memberNoAssignmentsMessage: content.crm.table.emptyMemberNoAssignments,
    searchOrFiltersMessage: content.crm.table.empty,
  });
  const showFirstProjectEmptyState = !listIsLoading && (list.totalCount ?? 0) === 0;

  const panelTitle = panelCopy.title;
  const searchInput = (
    <div className={styles.projectsSearchField}>
      <LuSearch className={styles.projectsSearchIcon} size={16} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={list.searchInput}
        onChange={(event) => list.setSearchInput(event.target.value)}
        placeholder={panelCopy.searchPlaceholder}
        aria-label={panelCopy.searchAriaLabel}
        className={styles.projectsSearchInline}
      />
    </div>
  );
  const mobileSearchInput = (
    <div className={styles.projectsSearchField}>
      <LuSearch className={styles.projectsSearchIcon} size={15} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={list.searchInput}
        onChange={(event) => list.setSearchInput(event.target.value)}
        placeholder={panelCopy.searchPlaceholder}
        aria-label={panelCopy.searchAriaLabel}
        className={styles.projectsSearchInline}
      />
    </div>
  );

  const headerFilterButton = (
    <CrmProjectsFilterMenu
      filters={list.filters}
      onChange={list.setFilters}
      triggerVariant={isMobileLayout ? 'ghost' : 'filter'}
      menuAlign="end"
    />
  );

  const selectionBulkActions = (
    <SubprojectsTableBulkActions
      busy={
        bulkActionBusy ||
        busyProjectId != null ||
        identitiesLoading ||
        bulkStatusChange.busy
      }
      canMakePriority={selectedPriorityEligible.length > 0}
      canAssign={selectedProjects.length > 0 && !identitiesLoading && !isMemberRole}
      canChangeStatus={selectedProjects.length > 0}
      assigneeOptions={assigneeOptions}
      onMakePriority={() => {
        void handleBulkMakePriority();
      }}
      onAssign={(assignedMemberId) => {
        void handleBulkAssign(assignedMemberId);
      }}
      onChangeStatus={(status) => {
        bulkStatusChange.requestBulkStatus(selectedProjects, status);
      }}
    />
  );

  const paginationChrome = (standalone: boolean) => (
    <div
      className={[
        styles.projectsListV2Pagination,
        standalone ? styles.projectsListV2Pagination_standalone : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Projects pagination"
    >
      <span className={styles.projectsListV2Range}>{list.rangeLabel}</span>
      <label className={styles.projectsListV2PageSize}>
        <span className={styles.projectsListV2PageSizeLabel}>Rows</span>
        <select
          value={list.limit}
          onChange={(event) => {
            const next = Number(event.target.value) as CrmProjectsListV2PageSize;
            if ((CRM_PROJECTS_LIST_V2_PAGE_SIZES as readonly number[]).includes(next)) {
              list.setLimit(next);
            }
          }}
          aria-label="Projects page size"
        >
          {CRM_PROJECTS_LIST_V2_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.projectsListV2Nav}>
        <button
          type="button"
          className={styles.projectsListV2NavButton}
          disabled={!list.hasPreviousPage || list.isFetchingPage}
          onClick={list.goPreviousPage}
          aria-label="Previous page"
        >
          <LuChevronLeft aria-hidden size={18} />
        </button>
        <button
          type="button"
          className={styles.projectsListV2NavButton}
          disabled={!list.hasNextPage || list.isFetchingPage}
          onClick={list.goNextPage}
          aria-label="Next page"
        >
          <LuChevronRight aria-hidden size={18} />
        </button>
      </div>
    </div>
  );

  const sharedTableChrome = {
    bulkSelection: bulkSelectionBindings,
    inlineSelectionChrome: true as const,
    workflowLikeTableChrome: true as const,
    rowsScrollOnly: true as const,
    bulkHeaderActions:
      canUseBulkActions && bulkSelection.selectedCount > 0 ? selectionBulkActions : null,
  };

  const showMobileBulkToolbar = isMobileLayout && canUseBulkActions && bulkSelection.selectedCount > 0;
  const selectedCountDisplay =
    bulkSelection.selectedCount > 99 ? '99+' : String(Math.max(0, bulkSelection.selectedCount));
  const [mobileShellBar, setMobileShellBar] = useState<HTMLElement | null>(null);
  const rowActionsBusyProjectId = busyProjectId;

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileShellBar(null);
      return;
    }
    const menuButton = document.querySelector<HTMLButtonElement>(
      'button[aria-controls="zenformed-mobile-drawer"]'
    );
    setMobileShellBar(menuButton?.parentElement ?? null);
  }, [isMobileLayout]);

  const mobileShellTopRow =
    isMobileLayout && mobileShellBar != null
      ? createPortal(
          <div className={styles.projectsMobileShellRow}>
            <div className={styles.projectsPanelMobileHeading}>{panelTitle}</div>
            <div className={styles.projectsPanelHeaderRowActions}>
              {!isMemberRole ? (
                <CrmProjectsDesktopCreateActions
                  variant="mobile"
                  createDisabled={createOpen}
                  importDisabled={importOpen}
                  onCreateClick={() => setCreateOpen(true)}
                  onImportClick={() => setImportMobileNoticeOpen(true)}
                />
              ) : null}
            </div>
          </div>,
          mobileShellBar
        )
      : null;

  if (!organizationId) {
    return (
      <section className={styles.projectsPanel} aria-label={panelTitle}>
        <p className={styles.mobileEmptyState}>Loading organization…</p>
      </section>
    );
  }

  return (
    <section
      className={styles.projectsPanel}
      data-crm-projects-dashboard
      data-crm-projects-list-v2="1"
      aria-label={panelTitle}
    >
      {toast ? (
        <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      ) : null}
      {list.showNewProjectsBanner ? (
        <div className={styles.projectsListV2Banner} role="status" aria-live="polite">
          <p className={styles.projectsListV2BannerMessage}>New projects available</p>
          <button
            type="button"
            className={styles.projectsListV2BannerButton}
            onClick={() => {
              void list.refetch();
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className={styles.projectsListV2BannerDismiss}
            aria-label="Dismiss"
            onClick={list.dismissNewProjectsBanner}
          >
            ×
          </button>
        </div>
      ) : null}
      <div
        className={[
          styles.projectsPanelHeader,
          isMobileLayout ? styles.projectsPanelHeader_mobile : styles.projectsPanelHeader_desktopToolbar,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isMobileLayout ? (
          <div className={styles.projectsPanelHeaderSecondaryRow}>
            {showMobileBulkToolbar ? (
              <div
                className={styles.projectsMobileBulkToolbar}
                role="toolbar"
                aria-label={bulkSelectionCopy.toolbarAriaLabel}
              >
                {selectionBulkActions}
              </div>
            ) : (
              <>
                {mobileSearchInput}
                {headerFilterButton}
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.projectsPanelHeaderLeft}>
              <div className={styles.projectsDesktopHeading}>
                <h1>{panelTitle}</h1>
                <p>{`${list.totalCount ?? 0} active projects`}</p>
              </div>
            </div>
            <div className={styles.projectsPanelHeaderCenter}>
              {searchInput}
              {headerFilterButton}
              {!isMemberRole ? (
                <CrmProjectsDesktopCreateActions
                  createDisabled={createOpen}
                  importDisabled={importOpen}
                  onCreateClick={() => setCreateOpen(true)}
                  onImportClick={() => setImportOpen(true)}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
      {isMobileLayout ? paginationChrome(true) : null}
      {showMobileBulkToolbar ? (
        <button
          type="button"
          className={styles.projectsMobileSelectedFloatingPill}
          aria-label={bulkSelectionCopy.cancel}
          title={bulkSelectionCopy.cancel}
          onClick={() => bulkSelection.clearSelection()}
        >
          {`${selectedCountDisplay} Selected`}
        </button>
      ) : null}
      {mobileShellTopRow}
      <div className={[styles.pipeline, styles.projectsPanelBody].filter(Boolean).join(' ')}>
        {isMobileLayout ? (
          <CrmProjectsMobileList
            rows={rootRows}
            pageSummariesByProjectId={list.pageSummariesById}
            childCountByParentId={childCountByParentId}
            isWorkflowProgressLoading={list.isSummariesLoading}
            isLoading={listIsLoading}
            isPaymentFinancialsLoading={list.isSummariesLoading}
            onRowClick={onProjectRowClick}
            onSubprojectRowClick={handleSubprojectRowClick}
            isMemberRole={isMemberRole}
            canDelete={canDelete && !isMemberRole}
            deletingProjectId={deletingProjectId}
            busyProjectId={rowActionsBusyProjectId}
            onRequestDelete={setPendingDeleteProject}
            onTogglePriority={togglePriority}
            emptyMessage={tableEmptyMessage}
            bulkSelection={bulkSelectionBindings}
          />
        ) : (
          <CrmProjectsTable
            rows={rootRows}
            pageSummariesByProjectId={list.pageSummariesById}
            childCountByParentId={childCountByParentId}
            isWorkflowProgressLoading={list.isSummariesLoading}
            isLoading={listIsLoading}
            isPaymentFinancialsLoading={list.isSummariesLoading}
            onRowClick={onProjectRowClick}
            onSubprojectRowClick={handleSubprojectRowClick}
            isMemberRole={isMemberRole}
            canDelete={canDelete && !isMemberRole}
            deletingProjectId={deletingProjectId}
            busyProjectId={rowActionsBusyProjectId}
            onRequestDelete={setPendingDeleteProject}
            onTogglePriority={togglePriority}
            emptyMessage={tableEmptyMessage}
            firstRunEmptyTitle={showFirstProjectEmptyState ? 'No Projects Yet' : null}
            firstRunEmptyActionLabel={
              showFirstProjectEmptyState && !isMemberRole ? 'Add your first Project' : null
            }
            onFirstRunEmptyAction={
              showFirstProjectEmptyState && !isMemberRole ? () => setCreateOpen(true) : null
            }
            dashboardCompactLayout
            projectColumnLabel="Project"
            dashboardTableToolbar={paginationChrome(false)}
            {...sharedTableChrome}
          />
        )}
      </div>
      <CreateCrmProjectModal
        open={createOpen && !isMemberRole}
        onClose={() => setCreateOpen(false)}
        onCreated={handleProjectCreated}
        onTemplateToast={(nextToast) => setToast(nextToast)}
      />
      <SpreadsheetImportWizard
        open={importOpen && !isMemberRole}
        onClose={() => setImportOpen(false)}
        mode="master_hierarchy"
        onCompleted={() => {
          void list.refetch();
          void onProjectCreated?.();
        }}
      />
      <SpreadsheetImportMobileNoticeDialog
        isOpen={importMobileNoticeOpen && !isMemberRole}
        onClose={() => setImportMobileNoticeOpen(false)}
      />
      <CrmProjectDeleteWorkflowDialog
        pendingProject={pendingDeleteProject}
        workflowCopy={
          pendingDeleteProject?.parentProjectId != null
            ? content.projectDetail.subprojects.delete.workflow
            : content.crm.delete.workflow
        }
        confirmDisabled={deletingProjectId != null}
        onClose={() => setPendingDeleteProject(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
      {!isMemberRole ? (
        <CrmProjectsBulkStatusDialogs
          statusChange={bulkStatusChange}
          selectedCount={selectedProjects.length}
          onError={(message) => setToast({ kind: 'error', message })}
        />
      ) : null}
    </section>
  );
}
