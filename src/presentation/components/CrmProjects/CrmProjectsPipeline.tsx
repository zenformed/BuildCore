'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useRouter } from 'next/navigation';
import {
  isCrmProjectComplete,
  isCrmProjectInactive,
  isProjectPriorityUrgent,
  type CrmProjectSummary,
} from '@/domain/crm';
import {
  listWorkflowStageCompletionStatuses,
} from '@/domain/buildcore/projectPipelineProgress';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { getCrmProjectDetailBySlug, setCrmProjectCompletion } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
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
import { DetailPanelHeaderButton } from '@/presentation/components/CrmProjectDetail/DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from '@/presentation/components/CrmProjectDetail/DetailPanelSectionRefresh';
import { SubprojectsTableBulkActions } from '@/presentation/components/CrmProjectDetail/SubprojectsTableBulkActions';
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectInactiveActions } from '@/presentation/features/crmProjects/useCrmProjectInactiveActions';
import { assignCrmProjectMember } from '@/presentation/features/crmProjects/assignCrmProjectMember';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  DEFAULT_DASHBOARD_LIST_VIEW_MODE,
  type DashboardListViewMode,
} from '@/presentation/features/crmProjects/dashboardListViewMode';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import {
  useAssignmentIdentityCatalog,
  useAssignmentIdentityState,
} from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { CrmProjectsFilterMenu } from './CrmProjectsFilterMenu';
import { CrmProjectsExpandAllButton } from './CrmProjectsExpandAllButton';
import { CrmProjectsListViewMenu } from './CrmProjectsListViewMenu';
import { CrmProjectsTable } from './CrmProjectsTable';
import { CrmProjectsMobileList } from './CrmProjectsMobileList';
import { MarkInactiveDialog } from './MarkInactiveDialog';
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
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const panelCopy = content.crm.panel;
  const detailCopy = content.projectDetail;
  const markInactiveCopy = content.projectDetail.subprojects.markInactive;
  const markActiveCopy = content.projectDetail.subprojects.markActive;
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
  const [expandedParentIds, setExpandedParentIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [listView, setListView] = useState<DashboardListViewMode>(DEFAULT_DASHBOARD_LIST_VIEW_MODE);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingBulkComplete, setPendingBulkComplete] = useState(false);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const {
    rootRows,
    allChildrenByParentId,
    visibleChildrenByParentId,
    parentById,
    subprojectRows,
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

  const { getCatalog } = useBuildCorePipelineStages();
  const resolveStagesForProject = useCallback(
    (project: CrmProjectSummary) =>
      getCatalog(resolvePipelineStageScopeForProject({ parentProjectId: project.parentProjectId })),
    [getCatalog]
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
    onProjectUpdated: patchProjectSummary,
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
      void refetch();
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

  const handleRequestMarkInactive = useCallback(
    (project: CrmProjectSummary) => {
      openMarkInactive({ mode: 'single', project });
    },
    [openMarkInactive]
  );

  const handleRequestMarkActive = useCallback(
    (project: CrmProjectSummary) => {
      void markProjectActive(project);
    },
    [markProjectActive]
  );

  const rowActionsBusyProjectId = busyProjectId ?? markingActiveProjectId;

  const priorityFilterActive = filters.priorities.length > 0;
  const isProjectsView = listView === 'projects';
  const isSubprojectsView = listView === 'subprojects';
  const subprojectColumnLabel = content.projectDetail.subprojects.projectColumn;

  const visibleProjects = useMemo(() => {
    if (isSubprojectsView) {
      return [...subprojectRows];
    }
    const list: CrmProjectSummary[] = [];
    for (const root of rootRows) {
      list.push(root);
      if (expandedParentIds.has(root.id)) {
        const children = visibleChildrenByParentId.get(root.id) ?? [];
        list.push(...children);
      }
    }
    return list;
  }, [
    expandedParentIds,
    isSubprojectsView,
    rootRows,
    subprojectRows,
    visibleChildrenByParentId,
  ]);

  const visibleIds = useMemo(() => visibleProjects.map((project) => project.id), [visibleProjects]);
  const selectedProjects = useMemo(
    () => visibleProjects.filter((project) => bulkSelection.selectedIds.has(project.id)),
    [bulkSelection.selectedIds, visibleProjects]
  );
  const selectedActiveProjects = useMemo(
    () => selectedProjects.filter((project) => project.subprojectStatus !== 'inactive'),
    [selectedProjects]
  );
  const selectedPriorityEligible = useMemo(
    () =>
      selectedProjects.filter(
        (project) =>
          !isCrmProjectComplete(project) &&
          !isCrmProjectInactive(project) &&
          !isProjectPriorityUrgent(project.priority)
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

  const handleBulkMarkComplete = useCallback(() => {
    if (selectedCompleteEligible.length === 0) return;
    setPendingBulkComplete(true);
  }, [selectedCompleteEligible.length]);

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
          patchProjectSummary(updated.summary);
          updatedCount += 1;
        } catch {
          // Continue remaining selections; toast failure summary below.
        }
      }
      if (updatedCount > 0) {
        setToast({
          kind: 'success',
          message: detailCopy.markCompleteSuccess,
        });
        bulkSelection.clearSelection();
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
    patchProjectSummary,
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

  const handleOpenBulkMarkInactive = useCallback(() => {
    if (selectedActiveProjects.length === 0) return;
    openMarkInactive({ mode: 'bulk', projects: selectedActiveProjects });
  }, [openMarkInactive, selectedActiveProjects]);

  const selectionBulkActions = (
    <SubprojectsTableBulkActions
      busy={bulkActionBusy || busyProjectId != null || markingInactive || identitiesLoading}
      canMakePriority={selectedPriorityEligible.length > 0}
      canMarkInactive={selectedActiveProjects.length > 0}
      canMarkComplete={selectedCompleteEligible.length > 0}
      canAssign={selectedProjects.length > 0 && !identitiesLoading}
      assigneeOptions={assigneeOptions}
      onMakePriority={() => {
        void handleBulkMakePriority();
      }}
      onMarkInactive={handleOpenBulkMarkInactive}
      onMarkComplete={handleBulkMarkComplete}
      onAssign={(assignedMemberId) => {
        void handleBulkAssign(assignedMemberId);
      }}
    />
  );

  const tableLeadingFilter = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      radiusFilter={radiusFilter}
      onRadiusFilterChange={setRadiusFilter}
      triggerVariant="caret"
      menuAlign="start"
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

  const expandableParentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const project of rootRows) {
      if ((allChildrenByParentId.get(project.id)?.length ?? 0) > 0) {
        ids.add(project.id);
      }
    }
    return ids;
  }, [allChildrenByParentId, rootRows]);

  const allSubprojectsExpanded = useMemo(() => {
    if (expandableParentIds.size === 0) {
      return false;
    }
    for (const parentId of expandableParentIds) {
      if (!expandedParentIds.has(parentId)) {
        return false;
      }
    }
    return true;
  }, [expandableParentIds, expandedParentIds]);

  const handleToggleExpandAllSubprojects = useCallback((): void => {
    if (allSubprojectsExpanded) {
      setExpandedParentIds(new Set());
      return;
    }
    setExpandedParentIds(new Set(expandableParentIds));
  }, [allSubprojectsExpanded, expandableParentIds]);

  const tableEmptyMessage = resolveCrmProjectsTableEmptyMessage({
    isMemberRole,
    totalProjectCount: totalCount,
    memberNoAssignmentsMessage: content.crm.table.emptyMemberNoAssignments,
    searchOrFiltersMessage: content.crm.table.empty,
  });

  const filterMenu = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      radiusFilter={radiusFilter}
      onRadiusFilterChange={setRadiusFilter}
    />
  );
  const expandAllButton = isProjectsView ? (
    <CrmProjectsExpandAllButton
      allExpanded={allSubprojectsExpanded}
      disabled={expandableParentIds.size === 0}
      onToggle={handleToggleExpandAllSubprojects}
    />
  ) : null;
  const panelTitle = isSubprojectsView
    ? panelCopy.listView.subprojects
    : panelCopy.title;
  const listViewMenu = (
    <CrmProjectsListViewMenu viewMode={listView} onChange={setListView} />
  );
  const searchInput = (
    <input
      type="search"
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
      placeholder={panelCopy.searchPlaceholder}
      aria-label={panelCopy.searchAriaLabel}
      className={styles.projectsSearch}
    />
  );
  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={panelTitle}
      onRefresh={refetch}
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

  const sharedTableChrome = {
    bulkSelection: bulkSelectionBindings,
    inlineSelectionChrome: true as const,
    leadingFilter: tableLeadingFilter,
    onRefresh: refetch,
    onRefreshError: (message: string) => setToast({ kind: 'error', message }),
    bulkHeaderActions:
      canUseBulkActions && bulkSelection.selectedCount > 0 ? selectionBulkActions : null,
  };

  return (
    <section
      className={styles.projectsPanel}
      data-crm-projects-dashboard
      aria-labelledby="crm-projects-heading"
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
          isMobileLayout ? styles.projectsPanelHeader_mobile : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isMobileLayout ? (
          <>
            <div className={styles.projectsPanelHeaderRow}>
              <div className={styles.projectsPanelTitleRow}>
                <h2 id="crm-projects-heading" className={styles.projectsPanelTitle}>
                  {panelTitle}
                </h2>
                {expandAllButton}
              </div>
              <div className={styles.projectsPanelHeaderRowActions}>
                {filterMenu}
              </div>
            </div>
            <div className={styles.projectsPanelHeaderRow}>
              <div className={styles.projectsPanelSearchWrap}>
                {listViewMenu}
                {searchInput}
              </div>
              <div className={styles.projectsPanelHeaderRowActions}>
                {refreshButton}
                {addButton}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.projectsPanelTitleRow}>
              <h2 id="crm-projects-heading" className={styles.projectsPanelTitle}>
                {panelTitle}
              </h2>
              {expandAllButton}
            </div>
            <div className={styles.projectsPanelHeaderTools}>
              {listViewMenu}
              {searchInput}
              {addButton}
            </div>
          </>
        )}
      </div>
      <div
        className={[
          styles.pipeline,
          styles.projectsPanelBody,
          isSubprojectsView ? styles.pipelineSubprojectsView : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isMobileLayout ? (
          isProjectsView ? (
            <CrmProjectsMobileList
              enableSubprojectExpansion
              autoExpandParentsWithSubprojects={priorityFilterActive}
              expandedParentIds={expandedParentIds}
              onExpandedParentIdsChange={setExpandedParentIds}
              rootRows={rootRows}
              allChildrenByParentId={allChildrenByParentId}
              visibleChildrenByParentId={visibleChildrenByParentId}
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
              onRequestCompletionChange={requestCompletionChange}
              onRequestMarkInactive={handleRequestMarkInactive}
              onRequestMarkActive={handleRequestMarkActive}
              emptyMessage={tableEmptyMessage}
            />
          ) : (
            <CrmProjectsMobileList
              rows={subprojectRows}
              parentById={parentById}
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
              onRequestCompletionChange={requestCompletionChange}
              onRequestMarkInactive={handleRequestMarkInactive}
              onRequestMarkActive={handleRequestMarkActive}
              emptyMessage={content.projectDetail.subprojects.empty}
            />
          )
        ) : isProjectsView ? (
          <CrmProjectsTable
            enableSubprojectExpansion
            autoExpandParentsWithSubprojects={priorityFilterActive}
            expandedParentIds={expandedParentIds}
            onExpandedParentIdsChange={setExpandedParentIds}
            rootRows={rootRows}
            allChildrenByParentId={allChildrenByParentId}
            visibleChildrenByParentId={visibleChildrenByParentId}
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
            onRequestCompletionChange={requestCompletionChange}
            onRequestMarkInactive={handleRequestMarkInactive}
            onRequestMarkActive={handleRequestMarkActive}
            emptyMessage={tableEmptyMessage}
            {...sharedTableChrome}
          />
        ) : (
          <CrmProjectsTable
            rows={subprojectRows}
            parentById={parentById}
            showParentProjectColumn
            projectColumnLabel={subprojectColumnLabel}
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
            onRequestCompletionChange={requestCompletionChange}
            onRequestMarkInactive={handleRequestMarkInactive}
            onRequestMarkActive={handleRequestMarkActive}
            emptyMessage={content.projectDetail.subprojects.empty}
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
