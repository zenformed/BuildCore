'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { LuSearch } from 'react-icons/lu';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  isCrmProjectComplete,
  isCrmProjectInactive,
  type CrmProjectSummary,
} from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  getCrmDataSource,
  shouldUseProductionCrmListV2,
} from '@/infrastructure/config/crmDataSource';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  EMPTY_RADIUS_FILTER,
  useCrmProjectsPipeline,
} from '@/presentation/features/crmProjects/useCrmProjectsPipeline';
import type { RadiusFilterState } from '@/presentation/features/filters/radiusFilterModel';
import {
  resolveCrmProjectsTableEmptyMessage,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
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
import { CrmProjectsDesktopCreateActions } from './CrmProjectsDesktopCreateActions';
import { CrmProjectsFilterMenu } from './CrmProjectsFilterMenu';
import { CrmProjectsTable } from './CrmProjectsTable';
import { CrmProjectsMobileList } from './CrmProjectsMobileList';
import { CrmProjectsBulkStatusDialogs } from './CrmProjectsBulkStatusDialogs';
import { CrmProjectsPipelineV2 } from './CrmProjectsPipelineV2';
import styles from './CrmProjects.module.css';

export type CrmProjectsPipelineProps = {
  onProjectRowClick: (project: CrmProjectSummary) => void;
  onProjectCreated?: () => void | Promise<void>;
};

type PipelineToast = { kind: 'success' | 'error'; message: string };

export function CrmProjectsPipeline({
  onProjectRowClick,
  onProjectCreated,
}: CrmProjectsPipelineProps): ReactElement {
  if (shouldUseProductionCrmListV2(isProjectsListV2ClientFlagEnabled())) {
    return (
      <Suspense fallback={<section className={styles.projectsPanel} aria-busy="true" />}>
        <CrmProjectsPipelineV2
          onProjectRowClick={onProjectRowClick}
          onProjectCreated={onProjectCreated}
        />
      </Suspense>
    );
  }

  return (
    <CrmProjectsPipelineV1
      onProjectRowClick={onProjectRowClick}
      onProjectCreated={onProjectCreated}
    />
  );
}

/** Unchanged v1 dashboard path (flag off). */
function CrmProjectsPipelineV1({
  onProjectRowClick,
  onProjectCreated,
}: CrmProjectsPipelineProps): ReactElement {
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const panelCopy = content.crm.panel;
  const bulkSelectionCopy = content.bulkSelection;
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const isMobileLayout = useDashboardMobileLayout();
  const isApiSource = getCrmDataSource() === 'api';
  const dash = useBuildCoreDashboardContext();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const { isLoading: identitiesLoading } = useAssignmentIdentityState();
  const bulkSelection = useBulkSelection<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilterState>(EMPTY_RADIUS_FILTER);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMobileNoticeOpen, setImportMobileNoticeOpen] = useState(false);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const {
    rootRows,
    allChildrenByParentId,
    paymentTasksIndex,
    workflowProgressInputIndex,
    totalCount,
    isLoading,
    isRadiusGeocoding,
    radiusGeocodingError,
    isPaymentFinancialsLoading,
    isWorkflowProgressLoading,
    refetch,
    removeProject,
    patchProjectSummary,
  } = useCrmProjectsPipeline(searchQuery, filters, radiusFilter);
  const [toast, setToast] = useState<PipelineToast | null>(null);
  const listIsLoading = isLoading || isRadiusGeocoding;

  const {
    pendingDeleteProject,
    setPendingDeleteProject,
    deletingProjectId,
    canDelete,
    handleConfirmDelete,
  } = useCrmProjectDeleteConfirmation({
    onProjectDeleted: removeProject,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const { busyProjectId, togglePriority } = useCrmProjectTableRowActions({
    onProjectUpdated: patchProjectSummary,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });


  const bulkStatusChange = useCrmProjectsBulkStatusChange({
    onProjectsUpdated: () => {
      void refetch();
      bulkSelection.clearSelection();
    },
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const rowActionsBusyProjectId = busyProjectId;

  const visibleProjects = useMemo(() => [...rootRows], [rootRows]);

  const visibleIds = useMemo(() => visibleProjects.map((project) => project.id), [visibleProjects]);
  const selectedProjects = useMemo(
    () => visibleProjects.filter((project) => bulkSelection.selectedIds.has(project.id)),
    [bulkSelection.selectedIds, visibleProjects]
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
          bulkSelection.clearSelection();
        } else {
          bulkSelection.selectAllVisible(visibleIds);
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
            patchProjectSummary(updated);
            updatedCount += 1;
          } catch {
            // Continue remaining selections; toast failure summary below.
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
    [bulkActionBusy, bulkSelection, patchProjectSummary, selectedProjects]
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

  const headerFilterButton = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      radiusFilter={radiusFilter}
      onRadiusFilterChange={setRadiusFilter}
      triggerVariant="ghost"
      menuAlign="end"
    />
  );

  useEffect(() => {
    const message = consumeCrmProjectDeleteSuccessToast();
    if (message) {
      setToast({ kind: 'success', message });
    }
  }, []);

  useEffect(() => {
    if (radiusGeocodingError == null) {
      return;
    }
    setToast({ kind: 'error', message: radiusGeocodingError });
  }, [radiusGeocodingError]);

  useEffect(() => {
    if (isMemberRole && createOpen) {
      setCreateOpen(false);
    }
  }, [createOpen, isMemberRole]);

  const handleProjectCreated = async (): Promise<void> => {
    await refetch();
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
    totalProjectCount: totalCount,
    memberNoAssignmentsMessage: content.crm.table.emptyMemberNoAssignments,
    searchOrFiltersMessage: content.crm.table.empty,
  });
  const showFirstProjectEmptyState = !listIsLoading && totalCount === 0;

  const panelTitle = panelCopy.title;
  const searchInput = (
    <div className={styles.projectsSearchField}>
      <LuSearch className={styles.projectsSearchIcon} size={16} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
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
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={panelCopy.searchPlaceholder}
        aria-label={panelCopy.searchAriaLabel}
        className={styles.projectsSearchInline}
      />
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

  return (
    <section
      className={styles.projectsPanel}
      data-crm-projects-dashboard
      aria-label={panelTitle}
    >
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
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
          <>
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
          </>
        ) : (
          <>
            <div className={styles.projectsPanelHeaderLeft}>
              <div className={styles.projectsDesktopHeading}>
                <h1>{panelTitle}</h1>
                <p>{`${totalCount ?? 0} active projects`}</p>
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
      <div
        className={[
          styles.pipeline,
          styles.projectsPanelBody,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isMobileLayout ? (
          <CrmProjectsMobileList
            rows={rootRows}
            paymentTasksIndex={paymentTasksIndex}
            workflowProgressInputIndex={workflowProgressInputIndex}
            isWorkflowProgressLoading={isWorkflowProgressLoading}
            isLoading={listIsLoading}
            isPaymentFinancialsLoading={isPaymentFinancialsLoading}
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
            allChildrenByParentId={allChildrenByParentId}
            paymentTasksIndex={paymentTasksIndex}
            workflowProgressInputIndex={workflowProgressInputIndex}
            isWorkflowProgressLoading={isWorkflowProgressLoading}
            isLoading={listIsLoading}
            isPaymentFinancialsLoading={isPaymentFinancialsLoading}
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
          void refetch();
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
