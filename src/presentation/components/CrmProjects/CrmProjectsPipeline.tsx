'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useRouter } from 'next/navigation';
import type { CrmProjectSummary } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
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
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectInactiveActions } from '@/presentation/features/crmProjects/useCrmProjectInactiveActions';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  DEFAULT_DASHBOARD_LIST_VIEW_MODE,
  type DashboardListViewMode,
} from '@/presentation/features/crmProjects/dashboardListViewMode';
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
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const isMobileLayout = useDashboardMobileLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilterState>(EMPTY_RADIUS_FILTER);
  const [expandedParentIds, setExpandedParentIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [listView, setListView] = useState<DashboardListViewMode>(DEFAULT_DASHBOARD_LIST_VIEW_MODE);
  const [createOpen, setCreateOpen] = useState(false);
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
    onMarkInactiveSuccess: () => {
      setToast({ kind: 'success', message: markInactiveCopy.success });
    },
    onMarkActiveSuccess: () => {
      setToast({ kind: 'success', message: markActiveCopy.success });
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
    [router]
  );

  const priorityFilterActive = filters.priorities.length > 0;
  const isProjectsView = listView === 'projects';
  const isSubprojectsView = listView === 'subprojects';
  const subprojectColumnLabel = content.projectDetail.subprojects.projectColumn;

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
      sectionLabel={panelCopy.title}
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
                  {panelCopy.title}
                </h2>
                {listViewMenu}
              </div>
              <div className={styles.projectsPanelHeaderRowActions}>
                {filterMenu}
                {expandAllButton}
              </div>
            </div>
            <div className={styles.projectsPanelHeaderRow}>
              <div className={styles.projectsPanelSearchWrap}>{searchInput}</div>
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
                {panelCopy.title}
              </h2>
              {listViewMenu}
            </div>
            <div className={styles.projectsPanelHeaderTools}>
              {filterMenu}
              {expandAllButton}
              {searchInput}
              {refreshButton}
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
        workflowCopy={content.crm.delete.workflow}
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
