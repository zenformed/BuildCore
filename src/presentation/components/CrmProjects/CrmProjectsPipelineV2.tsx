'use client';

/**
 * Dashboard Projects list v2 path (Phase 1B).
 * Used only when NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2=true.
 * Does not fetch org-wide rollup Maps.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { LuChevronLeft, LuChevronRight, LuFileSpreadsheet, LuSearch } from 'react-icons/lu';
import { createPortal } from 'react-dom';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useRouter } from 'next/navigation';
import {
  isCrmProjectComplete,
  isCrmProjectInactive,
  type CrmProjectSummary,
} from '@/domain/crm';
import { listWorkflowStageCompletionStatuses } from '@/domain/buildcore/projectPipelineProgress';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  CRM_PROJECTS_LIST_V2_PAGE_SIZES,
  type CrmProjectsListV2PageSize,
  type CrmProjectsListV2RootListItem,
} from '@/domain/crm/projectsListV2';
import { getCrmProjectDetailBySlug, setCrmProjectCompletion } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { resolveCrmProjectsTableEmptyMessage } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { consumeCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailPanelHeaderButton } from '@/presentation/components/CrmProjectDetail/DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from '@/presentation/components/CrmProjectDetail/DetailPanelSectionRefresh';
import { SubprojectsTableBulkActions } from '@/presentation/components/CrmProjectDetail/SubprojectsTableBulkActions';
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { SpreadsheetImportWizard } from '@/presentation/components/CrmImport/SpreadsheetImportWizard';
import { SpreadsheetImportMobileNoticeDialog } from '@/presentation/components/CrmImport/SpreadsheetImportMobileNoticeDialog';
import importStyles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectInactiveActions } from '@/presentation/features/crmProjects/useCrmProjectInactiveActions';
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
import { CrmProjectsFilterMenu } from './CrmProjectsFilterMenu';
import { CrmProjectsTable } from './CrmProjectsTable';
import { CrmProjectsMobileList } from './CrmProjectsMobileList';
import { MarkInactiveDialog } from './MarkInactiveDialog';
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
  const detailCopy = content.projectDetail;
  const markInactiveCopy = content.projectDetail.subprojects.markInactive;
  const markActiveCopy = content.projectDetail.subprojects.markActive;
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
  const [pendingBulkComplete, setPendingBulkComplete] = useState(false);
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

  const { getCatalog } = useBuildCorePipelineStages();
  const resolveStagesForProject = useCallback(
    (project: CrmProjectSummary) =>
      getCatalog(resolvePipelineStageScopeForProject({ parentProjectId: project.parentProjectId })),
    [getCatalog]
  );

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

  const {
    busyProjectId,
    pendingCompletionChange,
    setPendingCompletionChange,
    completionBlockedStageStatuses,
    setCompletionBlockedStageStatuses,
    togglePriority,
    requestCompletionChange,
    confirmCompletionChange,
  } = useCrmProjectTableRowActions({
    onProjectUpdated: patchAsRootItem,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
    resolveStagesForProject,
  });

  const {
    markInactiveTarget,
    openMarkInactive,
    closeMarkInactive,
    submitting: markingInactive,
    markingActiveProjectId,
    submitMarkInactive,
    markProjectActive,
  } = useCrmProjectInactiveActions({
    onProjectsUpdated: () => {
      void list.refetch();
    },
    onMarkInactiveSuccess: (updatedCount) => {
      setToast({
        kind: 'success',
        message:
          updatedCount > 1
            ? markInactiveCopy.bulkSuccess(updatedCount)
            : markInactiveCopy.success,
      });
      bulkSelection.clearSelection();
    },
    onMarkActiveSuccess: (updatedCount) => {
      setToast({
        kind: 'success',
        message:
          updatedCount > 1 ? markActiveCopy.bulkSuccess(updatedCount) : markActiveCopy.success,
      });
      bulkSelection.clearSelection();
    },
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const visibleIds = useMemo(() => rootRows.map((project) => project.id), [rootRows]);
  const selectedProjects = useMemo(
    () => rootRows.filter((project) => bulkSelection.selectedIds.has(project.id)),
    [bulkSelection.selectedIds, rootRows]
  );
  const selectedActiveProjects = useMemo(
    () => selectedProjects.filter((project) => project.subprojectStatus !== 'inactive'),
    [selectedProjects]
  );
  const selectedPriorityEligible = useMemo(
    () =>
      selectedProjects.filter(
        (project) => !isCrmProjectComplete(project) && !isCrmProjectInactive(project)
      ),
    [selectedProjects]
  );
  const selectedCompleteEligible = useMemo(
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

  const confirmBulkMarkComplete = useCallback(async () => {
    if (selectedCompleteEligible.length === 0) {
      setPendingBulkComplete(false);
      return;
    }
    setPendingBulkComplete(false);
    setBulkActionBusy(true);
    let updatedCount = 0;
    let blocked = false;
    try {
      for (const project of selectedCompleteEligible) {
        try {
          const detail = await getCrmProjectDetailBySlug(crmRepositories, project.slug);
          if (detail == null) continue;
          const stageStatuses = listWorkflowStageCompletionStatuses({
            workflowTasks: detail.workflowTasks,
            stages: resolveStagesForProject(project),
            manualStageCompletions: detail.manualStageCompletions,
          });
          if (stageStatuses.some((stage) => !stage.isComplete)) {
            setCompletionBlockedStageStatuses(stageStatuses);
            blocked = true;
            break;
          }
          const updated = await setCrmProjectCompletion(crmRepositories, project.slug, true);
          if (updated == null) continue;
          patchAsRootItem(updated.summary);
          updatedCount += 1;
        } catch {
          // Continue remaining selections.
        }
      }
      if (updatedCount > 0) {
        setToast({ kind: 'success', message: detailCopy.markCompleteSuccess });
        bulkSelection.clearSelection();
        void list.refetch();
      } else if (!blocked) {
        setToast({ kind: 'error', message: detailCopy.markCompleteFailed });
      }
    } finally {
      setBulkActionBusy(false);
    }
  }, [
    bulkSelection,
    detailCopy.markCompleteFailed,
    detailCopy.markCompleteSuccess,
    list,
    patchAsRootItem,
    resolveStagesForProject,
    selectedCompleteEligible,
    setCompletionBlockedStageStatuses,
  ]);

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
    <input
      type="search"
      value={list.searchInput}
      onChange={(event) => list.setSearchInput(event.target.value)}
      placeholder={panelCopy.searchPlaceholder}
      aria-label={panelCopy.searchAriaLabel}
      className={styles.projectsSearch}
    />
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

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={panelTitle}
      onRefresh={list.refetch}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );
  const addButton = !isMemberRole ? (
    <DetailPanelHeaderButton
      variant="add"
      disabled={createOpen}
      title={nav.header.newProject.title}
      aria-label={nav.header.newProject.ariaLabel}
      onClick={() => setCreateOpen(true)}
    />
  ) : null;
  const importButton = !isMemberRole ? (
    <button
      type="button"
      className={importStyles.toolbarImportButton}
      title={panelCopy.importSpreadsheet}
      aria-label={panelCopy.importSpreadsheetAriaLabel}
      disabled={importOpen}
      onClick={() => {
        if (isMobileLayout) {
          setImportMobileNoticeOpen(true);
          return;
        }
        setImportOpen(true);
      }}
    >
      <LuFileSpreadsheet size={16} strokeWidth={2} aria-hidden />
      {isMobileLayout ? null : panelCopy.importSpreadsheet}
    </button>
  ) : null;

  const headerFilterButton = (
    <CrmProjectsFilterMenu
      filters={list.filters}
      onChange={list.setFilters}
      triggerVariant="ghost"
      menuAlign="end"
    />
  );

  const selectionBulkActions = (
    <SubprojectsTableBulkActions
      busy={bulkActionBusy || busyProjectId != null || markingInactive || identitiesLoading}
      canMakePriority={selectedPriorityEligible.length > 0}
      canMarkInactive={selectedActiveProjects.length > 0}
      canMarkComplete={selectedCompleteEligible.length > 0}
      canAssign={selectedProjects.length > 0 && !identitiesLoading && !isMemberRole}
      assigneeOptions={assigneeOptions}
      onMakePriority={() => {
        void handleBulkMakePriority();
      }}
      onMarkInactive={() => {
        if (selectedActiveProjects.length === 0) return;
        openMarkInactive({ mode: 'bulk', projects: selectedActiveProjects });
      }}
      onMarkComplete={() => {
        if (selectedCompleteEligible.length === 0) return;
        setPendingBulkComplete(true);
      }}
      onAssign={(assignedMemberId) => {
        void handleBulkAssign(assignedMemberId);
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
  const rowActionsBusyProjectId = busyProjectId ?? markingActiveProjectId;

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
              {headerFilterButton}
              {importButton}
              {refreshButton}
              {addButton}
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
        <div className={styles.projectsListV2Banner} role="status">
          <span>New Projects available — Refresh</span>
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
          isMobileLayout ? styles.projectsPanelHeader_mobile : '',
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
              mobileSearchInput
            )}
          </div>
        ) : (
          <>
            {paginationChrome(false)}
            <div className={styles.projectsPanelHeaderTools}>
              {headerFilterButton}
              {searchInput}
              {importButton}
              {refreshButton}
              {addButton}
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
            onRequestCompletionChange={requestCompletionChange}
            onRequestMarkInactive={(project) => openMarkInactive({ mode: 'single', project })}
            onRequestMarkActive={(project) => {
              void markProjectActive(project);
            }}
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
            onRequestCompletionChange={requestCompletionChange}
            onRequestMarkInactive={(project) => openMarkInactive({ mode: 'single', project })}
            onRequestMarkActive={(project) => {
              void markProjectActive(project);
            }}
            emptyMessage={tableEmptyMessage}
            firstRunEmptyTitle={showFirstProjectEmptyState ? 'No Projects Yet' : null}
            firstRunEmptyActionLabel={
              showFirstProjectEmptyState && !isMemberRole ? 'Add your first Project' : null
            }
            onFirstRunEmptyAction={
              showFirstProjectEmptyState && !isMemberRole ? () => setCreateOpen(true) : null
            }
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
      <ProjectCompletionBlockedDialog
        isOpen={completionBlockedStageStatuses != null}
        stageStatuses={completionBlockedStageStatuses}
        onClose={() => setCompletionBlockedStageStatuses(null)}
      />
      <ConfirmModal
        isOpen={pendingCompletionChange != null}
        onClose={() => setPendingCompletionChange(null)}
        onConfirm={() => {
          void confirmCompletionChange();
        }}
        title={
          pendingCompletionChange?.complete
            ? detailCopy.markCompleteConfirmTitle
            : detailCopy.markIncompleteConfirmTitle
        }
        message={
          pendingCompletionChange?.complete
            ? detailCopy.markCompleteConfirmMessage
            : detailCopy.markIncompleteConfirmMessage
        }
        confirmLabel={
          pendingCompletionChange?.complete
            ? detailCopy.markComplete
            : detailCopy.markIncomplete
        }
        cancelLabel={detailCopy.workflow.archiveTaskCancelLabel}
        variant="primary"
        hideIcon
      />
      <ConfirmModal
        isOpen={pendingBulkComplete}
        onClose={() => setPendingBulkComplete(false)}
        onConfirm={() => {
          void confirmBulkMarkComplete();
        }}
        title={detailCopy.markCompleteConfirmTitle}
        message={detailCopy.markCompleteConfirmMessage}
        confirmLabel={detailCopy.markComplete}
        cancelLabel={detailCopy.workflow.archiveTaskCancelLabel}
        variant="primary"
        hideIcon
      />
      {!isMemberRole ? (
        <MarkInactiveDialog
          target={markInactiveTarget}
          submitting={markingInactive}
          onClose={closeMarkInactive}
          onSubmit={(values) => {
            void submitMarkInactive(values);
          }}
        />
      ) : null}
    </section>
  );
}
