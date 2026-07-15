'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactElement } from 'react';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useRouter } from 'next/navigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  isCrmProjectComplete,
  isCrmProjectInactive,
  isProjectPriorityUrgent,
  type CrmProjectSummary,
} from '@/domain/crm';
import {
  computeSubprojectAverageProgressPercent,
  formatSubprojectAverageProgressPercent,
  listWorkflowStageCompletionStatuses,
} from '@/domain/buildcore/projectPipelineProgress';
import { getCrmProjectDetailBySlug, setCrmProjectCompletion } from '@/application/use-cases/crm';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { CrmProjectsTable } from '@/presentation/components/CrmProjects/CrmProjectsTable';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { SubprojectsMobileList } from './SubprojectsMobileList';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useSubprojectListRows } from '@/presentation/features/crmProjectDetail/useSubprojectListRows';
import { EMPTY_CRM_PROJECTS_LIST_FILTERS } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { EMPTY_RADIUS_FILTER, type RadiusFilterState } from '@/presentation/features/filters/radiusFilterModel';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { useCrmProjectBulkDeleteActions } from '@/presentation/features/crmProjects/useCrmProjectBulkDeleteActions';
import { useCrmProjectInactiveActions } from '@/presentation/features/crmProjects/useCrmProjectInactiveActions';
import { formatCrmProjectDeleteWorkflowItemLabel } from '@/presentation/features/crmProjects/crmProjectDeleteWorkflow';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { assignCrmProjectMember } from '@/presentation/features/crmProjects/assignCrmProjectMember';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useCrmProjectPaymentTasksIndex } from '@/presentation/features/crmProjects/useCrmProjectPaymentTasksIndex';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { DestructiveConfirmationWorkflowDialog } from '@/presentation/components/DestructiveConfirmationWorkflow';
import { BulkSendAttachmentDialog } from '@/presentation/components/communications/BulkSendAttachmentDialog';
import { MarkInactiveDialog } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import { useBulkSendAttachmentDialog } from '@/presentation/features/communications/useBulkSendAttachmentDialog';
import {
  useAssignmentIdentityCatalog,
  useAssignmentIdentityState,
} from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { SubprojectsListToolbar } from './SubprojectsListToolbar';
import { SubprojectsTableBulkActions } from './SubprojectsTableBulkActions';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';
import tableStyles from '../CrmProjects/CrmProjects.module.css';

type SubprojectsToast = { kind: 'success' | 'error'; message: string };

export function SubprojectsSection(): ReactElement | null {
  const { project, subSlug } = useProjectDetailShell();
  if (subSlug != null || project.summary.parentProjectId != null) {
    return null;
  }
  return <SubprojectsSectionContent />;
}

function SubprojectsSectionContent(): ReactElement {
  const router = useRouter();
  const sectionId = useId();
  const panelId = useId();
  const copy = content.projectDetail.subprojects;
  const markInactiveCopy = copy.markInactive;
  const markActiveCopy = copy.markActive;
  const deleteCopy = copy.delete;
  const bulkDeleteItemLabel = copy.bulkDelete.itemLabel;
  const bulkDeleteConfig = copy.bulkDelete;
  const bulkSelectionCopy = content.bulkSelection;
  const bulkDeleteCopy = content.bulkDelete;
  const destructiveWorkflowCopy = content.destructiveConfirmationWorkflow;
  const detailCopy = content.projectDetail;
  const { project, routes, parentRouteSlug, isMemberRole, childSummaries, isApiSource } =
    useProjectDetailShell();
  const dash = useBuildCoreDashboardContext();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const { isLoading: identitiesLoading } = useAssignmentIdentityState();
  const assigneeOptions = useMemo(
    () => getCrmProjectAssigneeOptions(isApiSource, assignmentCatalog, dash.user?.id),
    [assignmentCatalog, dash.user?.id, isApiSource]
  );
  const { organizationMembershipContext } = useSaaSProfile();
  const canManage = !isMemberRole && !isBuildCoreMemberRole(organizationMembershipContext?.role);
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilters, setListFilters] = useState(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilterState>(EMPTY_RADIUS_FILTER);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [toast, setToast] = useState<SubprojectsToast | null>(null);
  const refetch = childSummaries?.refetch ?? (async () => undefined);
  const appendChildProjectSummary =
    childSummaries?.appendProjectSummary ?? (() => undefined);
  const patchChildProjectSummary =
    childSummaries?.patchProjectSummary ?? (() => undefined);
  const isLoading = childSummaries?.isLoading ?? false;
  const { paymentTasksIndex, isLoading: isPaymentFinancialsLoading } =
    useCrmProjectPaymentTasksIndex();
  const { workflowProgressInputIndex, workflowTaskStatusIndex, isLoading: isWorkflowRollupsLoading } =
    useCrmPaymentTasksIndexContext();
  const { getCatalog } = useBuildCorePipelineStages();
  const subprojectStageCatalog = getCatalog('subproject');
  const resolveStagesForProject = useCallback(
    (childProject: { readonly parentProjectId: string | null }) =>
      getCatalog(resolvePipelineStageScopeForProject({ parentProjectId: childProject.parentProjectId })),
    [getCatalog]
  );
  const isWorkflowProgressLoading = isWorkflowRollupsLoading;
  const listFilterContext = useMemo(
    () => ({
      workflowTaskStatusIndex,
      workflowTaskStatusIndexReady: !isWorkflowRollupsLoading,
      workflowProgressInputIndex,
      workflowProgressInputIndexReady: !isWorkflowRollupsLoading,
      resolveStagesForProject,
    }),
    [
      isWorkflowRollupsLoading,
      resolveStagesForProject,
      workflowProgressInputIndex,
      workflowTaskStatusIndex,
    ]
  );
  const {
    rows,
    isRadiusGeocoding,
    radiusGeocodingError,
    isNarrowingResults,
  } = useSubprojectListRows(
    childSummaries?.allRows ?? [],
    searchQuery,
    listFilters,
    listFilterContext,
    radiusFilter
  );
  const listIsLoading = isLoading || isRadiusGeocoding;
  const allSubprojectCount = childSummaries?.allRows.length ?? 0;
  const subprojectAveragePercent = useMemo(() => {
    if (isMemberRole || allSubprojectCount === 0 || isLoading || isWorkflowProgressLoading) {
      return null;
    }

    const averagePercent = computeSubprojectAverageProgressPercent({
      childSummaries: childSummaries?.allRows ?? [],
      workflowProgressInputIndex,
      stages: subprojectStageCatalog,
    });

    if (averagePercent == null) {
      return null;
    }

    return formatSubprojectAverageProgressPercent(averagePercent);
  }, [
    allSubprojectCount,
    childSummaries?.allRows,
    isLoading,
    isMemberRole,
    isWorkflowProgressLoading,
    subprojectStageCatalog,
    workflowProgressInputIndex,
  ]);
  const subprojectsEmptyMessage =
    isMemberRole && allSubprojectCount === 0
      ? copy.emptyMemberNoAssignments
      : allSubprojectCount > 0 && rows.length === 0 && isNarrowingResults
        ? content.crm.table.empty
        : copy.empty;
  const isMobileLayout = useDashboardMobileLayout();
  const bulkSelection = useBulkSelection<string>();
  const bulkSendAttachment = useBulkSendAttachmentDialog({
    parentProjectSlug: project.summary.slug,
    parentProjectName: project.summary.name,
    onComplete: (result) => {
      if (result.failedCount === 0 && result.sentCount > 0) {
        setToast({ kind: 'success', message: copy.bulkSendAttachment.success });
      }
    },
  });

  useEffect(() => {
    if (radiusGeocodingError == null) {
      return;
    }
    setToast({ kind: 'error', message: radiusGeocodingError });
  }, [radiusGeocodingError]);

  const {
    pendingDeleteProject,
    setPendingDeleteProject,
    deletingProjectId,
    canDelete,
    handleConfirmDelete,
  } = useCrmProjectDeleteConfirmation({
    onProjectDeleted: () => {
      refetch();
    },
    onSuccess: () => setToast({ kind: 'success', message: deleteCopy.success }),
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedProjects = useMemo(
    () => rows.filter((row) => bulkSelection.selectedIds.has(row.id)),
    [bulkSelection.selectedIds, rows]
  );
  const selectedInactiveProjects = useMemo(
    () => selectedProjects.filter((project) => project.subprojectStatus === 'inactive'),
    [selectedProjects]
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
  const [pendingBulkComplete, setPendingBulkComplete] = useState(false);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);

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
  }, [bulkSelection, bulkSelectionCopy.selectAllAriaLabel, bulkSelectionCopy.selectItemAriaLabel, canUseBulkActions, visibleIds]);

  const handleSubprojectRowClick = useCallback(
    (child: CrmProjectSummary) => {
      router.push(routes.subproject(child.slug));
    },
    [router, routes]
  );

  const { deleting: bulkDeleting, deleteProjects: deleteSelectedProjects } =
    useCrmProjectBulkDeleteActions({
      onProjectsDeleted: () => {
        void refetch();
      },
      onSuccess: (deletedCount) => {
        setToast({
          kind: 'success',
          message: bulkDeleteCopy.success(deletedCount, bulkDeleteItemLabel),
        });
        bulkSelection.clearSelection();
        setBulkDeleteOpen(false);
      },
      onError: (message) => setToast({ kind: 'error', message }),
    });

  const handleConfirmBulkDelete = useCallback(async () => {
    const ok = await deleteSelectedProjects(selectedProjects);
    if (ok) {
      setBulkDeleteOpen(false);
      bulkSelection.clearSelection();
    }
  }, [bulkSelection, deleteSelectedProjects, selectedProjects]);

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
        message: markInactiveCopy.bulkSuccess(updatedCount),
      });
      bulkSelection.clearSelection();
    },
    onMarkActiveSuccess: (updatedCount) => {
      setToast({
        kind: 'success',
        message: markActiveCopy.bulkSuccess(updatedCount),
      });
      bulkSelection.clearSelection();
    },
    onError: (message) => setToast({ kind: 'error', message }),
  });

  const handleOpenBulkMarkInactive = useCallback(() => {
    if (selectedActiveProjects.length === 0) return;
    openMarkInactive({ mode: 'bulk', projects: selectedActiveProjects });
  }, [openMarkInactive, selectedActiveProjects]);

  const handleRequestMarkInactive = useCallback(
    (childProject: CrmProjectSummary) => {
      openMarkInactive({ mode: 'single', project: childProject });
    },
    [openMarkInactive]
  );

  const handleRequestMarkActive = useCallback(
    (childProject: CrmProjectSummary) => {
      void markProjectActive(childProject);
    },
    [markProjectActive]
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
    onProjectUpdated: patchChildProjectSummary,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
    resolveStagesForProject,
  });

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
          patchChildProjectSummary(updated.summary);
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
    patchChildProjectSummary,
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
            patchChildProjectSummary(updated);
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
    [bulkActionBusy, bulkSelection, patchChildProjectSummary, selectedProjects]
  );

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

  const onContactCopied = useCallback(
    (message: string) => setToast({ kind: 'success', message }),
    []
  );

  const panelClass = [
    styles.subprojectsPanel,
    expanded ? '' : styles.subprojectsPanel_collapsed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass} aria-labelledby={sectionId}>
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div
        className={[
          styles.subprojectsPanelHeader,
          isMobileLayout && bulkSelection.selectedCount > 0 && canUseBulkActions
            ? 'subprojectsPanelHeader_selectionMode'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className={styles.subprojectsPanelHeaderToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${expanded ? copy.collapse : copy.expand}: ${copy.title}`}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className={styles.subprojectsPanelHeaderTitle}>
            {subprojectAveragePercent != null ? (
              <span
                className={`${shared.stagePill} ${styles.subprojectsAveragePill}`}
                title={`${copy.projectColumn} average ${subprojectAveragePercent}`}
              >
                {subprojectAveragePercent}
              </span>
            ) : null}
            <span id={sectionId} className={styles.subprojectsPanelTitle}>
              {copy.title}
            </span>
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
            </span>
          </span>
        </button>
        <div
          className={[
            styles.subprojectsPanelHeaderTools,
            isMobileLayout && bulkSelection.selectedCount > 0 && canUseBulkActions
              ? styles.subprojectsPanelHeaderTools_selectionMode
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <SubprojectsListToolbar
            expanded={expanded}
            isMobileLayout={isMobileLayout}
            searchQuery={searchQuery}
            searchPlaceholder={copy.searchPlaceholder}
            searchAriaLabel={copy.searchAriaLabel}
            onSearchQueryChange={setSearchQuery}
            sectionLabel={copy.title}
            onRefresh={refetch}
            onRefreshError={(message) => setToast({ kind: 'error', message })}
            canManage={canManage}
            newSubprojectTitle={copy.newSubprojectTitle}
            newSubprojectAriaLabel={copy.newSubprojectAriaLabel}
            onCreateOpen={() => setCreateOpen(true)}
            listFilters={listFilters}
            onListFiltersChange={setListFilters}
            radiusFilter={radiusFilter}
            onRadiusFilterChange={setRadiusFilter}
            showMobileBulkToolbar={
              isMobileLayout && bulkSelection.selectedCount > 0 && canUseBulkActions
            }
            selectedCountLabel={bulkSelectionCopy.selectedCount(bulkSelection.selectedCount)}
            bulkToolbarAriaLabel={bulkSelectionCopy.toolbarAriaLabel}
            bulkCancelLabel={bulkSelectionCopy.cancel}
            onClearSelection={() => bulkSelection.clearSelection()}
            mobileBulkActions={selectionBulkActions}
          />
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className={styles.subprojectsTableBody}>
          {isMobileLayout ? (
            <SubprojectsMobileList
              rows={rows}
              paymentTasksIndex={paymentTasksIndex}
              workflowProgressInputIndex={workflowProgressInputIndex}
              isWorkflowProgressLoading={isWorkflowProgressLoading}
              isLoading={listIsLoading}
              isPaymentFinancialsLoading={isPaymentFinancialsLoading}
              isMemberRole={isMemberRole}
              canDelete={canDelete && !isMemberRole}
              deletingProjectId={deletingProjectId}
              busyProjectId={busyProjectId ?? markingActiveProjectId}
              onRequestDelete={setPendingDeleteProject}
              onTogglePriority={togglePriority}
              onRequestCompletionChange={requestCompletionChange}
              onRequestMarkInactive={handleRequestMarkInactive}
              onRequestMarkActive={handleRequestMarkActive}
              showActions={!isMemberRole}
              emptyMessage={subprojectsEmptyMessage}
              onRowClick={handleSubprojectRowClick}
              bulkSelection={bulkSelectionBindings}
              onContactCopied={onContactCopied}
            />
          ) : (
            <div className={`${tableStyles.pipeline} ${tableStyles.pipelineFitContent}`}>
              <CrmProjectsTable
                rows={rows}
                paymentTasksIndex={paymentTasksIndex}
                workflowProgressInputIndex={workflowProgressInputIndex}
                isWorkflowProgressLoading={isWorkflowProgressLoading}
                isLoading={listIsLoading}
                isPaymentFinancialsLoading={isPaymentFinancialsLoading}
                isMemberRole={isMemberRole}
                canDelete={canDelete && !isMemberRole}
                deletingProjectId={deletingProjectId}
                busyProjectId={busyProjectId ?? markingActiveProjectId}
                onRequestDelete={setPendingDeleteProject}
                onTogglePriority={togglePriority}
                onRequestCompletionChange={requestCompletionChange}
                onRequestMarkInactive={handleRequestMarkInactive}
                onRequestMarkActive={handleRequestMarkActive}
                showActions={!isMemberRole}
                projectColumnLabel={copy.projectColumn}
                emptyMessage={subprojectsEmptyMessage}
                onRowClick={handleSubprojectRowClick}
                bulkSelection={bulkSelectionBindings}
                onContactCopied={onContactCopied}
                progressTone="progress"
                inlineSelectionChrome
                leadingFilter={
                  <CrmProjectsFilterMenu
                    filters={listFilters}
                    onChange={setListFilters}
                    stageScopeMode="subproject"
                    radiusFilter={radiusFilter}
                    onRadiusFilterChange={setRadiusFilter}
                    triggerVariant="caret"
                    menuAlign="start"
                  />
                }
                onRefresh={refetch}
                onRefreshError={(message) => setToast({ kind: 'error', message })}
                bulkHeaderActions={
                  canUseBulkActions && bulkSelection.selectedCount > 0
                    ? selectionBulkActions
                    : null
                }
              />
            </div>
          )}
        </div>
      ) : null}

      {canManage ? (
        <CreateCrmProjectModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          createTitle={copy.newSubprojectTitle}
          parentProjectId={project.summary.id}
          parentProjectSlug={parentRouteSlug}
          parentProjectForDefaults={project}
          redirectOnCreate={false}
          onCreated={(created) => {
            appendChildProjectSummary(created.summary);
            void refetch();
          }}
        />
      ) : null}

      {!isMemberRole ? (
        <>
          <CrmProjectDeleteWorkflowDialog
            pendingProject={pendingDeleteProject}
            workflowCopy={deleteCopy.workflow}
            confirmDisabled={deletingProjectId != null}
            onClose={() => setPendingDeleteProject(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
          <DestructiveConfirmationWorkflowDialog
            open={bulkDeleteOpen}
            title={destructiveWorkflowCopy.title}
            itemTypeLabel={bulkDeleteItemLabel}
            selectedCount={bulkSelection.selectedCount}
            selectedItemLabels={selectedProjects.map(formatCrmProjectDeleteWorkflowItemLabel)}
            maxVisibleItems={5}
            selectedCountMessage={destructiveWorkflowCopy.selectedCountMessage(
              bulkSelection.selectedCount,
              bulkDeleteItemLabel
            )}
            moreItemsLabel={destructiveWorkflowCopy.moreItems}
            consequenceDescription={bulkDeleteConfig.consequenceDescription}
            affectedDataSummary={bulkDeleteConfig.affectedDataSummary}
            irrevocableWarning={destructiveWorkflowCopy.irrevocableWarning}
            confirmationPhrase={bulkDeleteCopy.confirmPhrase}
            confirmationInstructions={destructiveWorkflowCopy.confirmationInstructions(
              bulkDeleteCopy.confirmPhrase
            )}
            intentActionLabel={destructiveWorkflowCopy.intentActionLabel}
            consequencesAcknowledgeLabel={destructiveWorkflowCopy.consequencesAcknowledgeLabel}
            finalActionLabel={destructiveWorkflowCopy.finalActionLabel}
            closeAriaLabel={destructiveWorkflowCopy.closeAriaLabel}
            confirmDisabled={bulkDeleting}
            onCancel={() => setBulkDeleteOpen(false)}
            onConfirm={() => void handleConfirmBulkDelete()}
          />
          <BulkSendAttachmentDialog
            open={bulkSendAttachment.open}
            recipientSummary={bulkSendAttachment.recipientSummary}
            deliveryRows={bulkSendAttachment.deliveryRows}
            subject={bulkSendAttachment.subject}
            message={bulkSendAttachment.message}
            selectedAttachments={bulkSendAttachment.selectedAttachments}
            sending={bulkSendAttachment.sending}
            progressLabel={bulkSendAttachment.progressLabel}
            feedback={bulkSendAttachment.feedback}
            completed={bulkSendAttachment.completed}
            canSend={bulkSendAttachment.canSend}
            readyCount={bulkSendAttachment.readyCount}
            onSubjectChange={bulkSendAttachment.setSubject}
            onMessageChange={bulkSendAttachment.setMessage}
            onAddFiles={bulkSendAttachment.addFiles}
            onRemoveSelectedAttachment={bulkSendAttachment.removeSelectedAttachment}
            onClose={() => {
              const wasCompleted = bulkSendAttachment.completed;
              bulkSendAttachment.closeDialog();
              if (wasCompleted) {
                bulkSelection.clearSelection();
              }
            }}
            onSend={() => {
              void bulkSendAttachment.sendBulkAttachment();
            }}
          />
          <MarkInactiveDialog
            target={markInactiveTarget}
            submitting={markingInactive}
            onClose={closeMarkInactive}
            onSubmit={(values) => {
              void submitMarkInactive(values);
            }}
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
        </>
      ) : null}
    </section>
  );
}
