'use client';

import { useCallback, useId, useMemo, useState, type ReactElement } from 'react';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useRouter } from 'next/navigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { CrmProjectsTable } from '@/presentation/components/CrmProjects/CrmProjectsTable';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { SubprojectsMobileList } from './SubprojectsMobileList';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import {
  filterSubprojects,
} from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { useCrmProjectBulkDeleteActions } from '@/presentation/features/crmProjects/useCrmProjectBulkDeleteActions';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectPaymentTasksIndex } from '@/presentation/features/crmProjects/useCrmProjectPaymentTasksIndex';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import {
  computeSubprojectAverageProgressPercent,
  formatSubprojectAverageProgressPercent,
} from '@/domain/buildcore/projectPipelineProgress';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useBulkSelection } from '@/presentation/features/bulkSelection/useBulkSelection';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import {
  BulkSelectionToolbar,
} from '@/presentation/components/BulkSelection';
import { DestructiveConfirmationWorkflowDialog } from '@/presentation/components/DestructiveConfirmationWorkflow';
import bulkSelectionStyles from '@/presentation/components/BulkSelection/BulkSelection.module.css';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';
import tableStyles from '../CrmProjects/CrmProjects.module.css';

type SubprojectsToast = { kind: 'success' | 'error'; message: string };

export function SubprojectsSection(): ReactElement | null {
  const router = useRouter();
  const sectionId = useId();
  const panelId = useId();
  const copy = content.projectDetail.subprojects;
  const deleteCopy = copy.delete;
  const bulkDeleteItemLabel = copy.bulkDelete.itemLabel;
  const bulkDeleteConfig = copy.bulkDelete;
  const bulkSelectionCopy = content.bulkSelection;
  const bulkDeleteCopy = content.bulkDelete;
  const destructiveWorkflowCopy = content.destructiveConfirmationWorkflow;
  const detailCopy = content.projectDetail;
  const { project, routes, parentRouteSlug, subSlug, isMemberRole, childSummaries } =
    useProjectDetailShell();
  const { organizationMembershipContext } = useSaaSProfile();
  const hidden = subSlug != null || project.summary.parentProjectId != null;
  const canManage = !isMemberRole && !isBuildCoreMemberRole(organizationMembershipContext?.role);
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
  const { workflowProgressInputIndex, isLoading: isWorkflowProgressLoading } =
    useCrmPaymentTasksIndexContext();
  const { getCatalog } = useBuildCorePipelineStages();
  const subprojectStageCatalog = getCatalog('subproject');
  const resolveStagesForProject = useCallback(
    (childProject: { readonly parentProjectId: string | null }) =>
      getCatalog(resolvePipelineStageScopeForProject({ parentProjectId: childProject.parentProjectId })),
    [getCatalog]
  );
  const rows = useMemo(
    () => filterSubprojects(childSummaries?.allRows ?? [], searchQuery),
    [childSummaries?.allRows, searchQuery]
  );
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
      : allSubprojectCount > 0 && rows.length === 0 && searchQuery.trim().length > 0
        ? content.crm.table.empty
        : copy.empty;
  const isMobileLayout = useDashboardMobileLayout();
  const bulkSelection = useBulkSelection<string>();

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
  const canUseBulkActions = canDelete && !isMemberRole;

  const bulkSelectionBindings = useMemo<BulkSelectionBindings | undefined>(() => {
    if (!bulkSelection.selectionMode) return undefined;
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
  }, [bulkSelection, bulkSelectionCopy.selectAllAriaLabel, bulkSelectionCopy.selectItemAriaLabel, visibleIds]);

  const handleSubprojectRowClick = useCallback(
    (child: CrmProjectSummary) => {
      if (bulkSelection.selectionMode) {
        bulkSelection.toggle(child.id);
        return;
      }
      router.push(routes.subproject(child.slug));
    },
    [bulkSelection, router, routes]
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
        bulkSelection.exitSelectionMode();
        setBulkDeleteOpen(false);
      },
      onError: (message) => setToast({ kind: 'error', message }),
    });

  const handleConfirmBulkDelete = useCallback(async () => {
    const ok = await deleteSelectedProjects(selectedProjects);
    if (ok) {
      setBulkDeleteOpen(false);
      bulkSelection.exitSelectionMode();
    }
  }, [bulkSelection, deleteSelectedProjects, selectedProjects]);

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

  if (hidden) {
    return null;
  }

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
          bulkSelection.selectionMode && canUseBulkActions
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
                title={`Subproject average ${subprojectAveragePercent}`}
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
            bulkSelection.selectionMode && canUseBulkActions
              ? styles.subprojectsPanelHeaderTools_selectionMode
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {bulkSelection.selectionMode && canUseBulkActions ? (
            <BulkSelectionToolbar
              variant="header"
              className={
                isMobileLayout ? bulkSelectionStyles.bulkSelectionToolbar_headerStacked : undefined
              }
              selectedCount={bulkSelection.selectedCount}
              selectedCountLabel={bulkSelectionCopy.selectedCount(bulkSelection.selectedCount)}
              ariaLabel={bulkSelectionCopy.toolbarAriaLabel}
              cancelLabel={bulkSelectionCopy.cancel}
              onCancel={() => bulkSelection.exitSelectionMode()}
              actions={[
                {
                  id: 'send',
                  label: bulkSelectionCopy.send,
                  disabled: true,
                  title: bulkSelectionCopy.sendUnavailableTitle,
                  onClick: () => undefined,
                },
                {
                  id: 'delete',
                  label: bulkSelectionCopy.delete,
                  variant: 'danger',
                  disabled: bulkDeleting || bulkSelection.selectedCount === 0,
                  onClick: () => setBulkDeleteOpen(true),
                },
              ]}
            />
          ) : (
            <>
              {expanded ? (
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  aria-label={copy.searchAriaLabel}
                  className={styles.subprojectsSearch}
                />
              ) : null}
              <DetailPanelSectionRefresh
                sectionLabel={copy.title}
                onRefresh={refetch}
                onError={(message) => setToast({ kind: 'error', message })}
              />
              {canManage ? (
                <DetailPanelHeaderButton
                  variant="add"
                  title={copy.newSubprojectTitle}
                  aria-label={copy.newSubprojectAriaLabel}
                  onClick={() => setCreateOpen(true)}
                />
              ) : null}
              {canUseBulkActions ? (
                <button
                  type="button"
                  className={styles.subprojectsSelectBtn}
                  onClick={() => bulkSelection.enterSelectionMode()}
                >
                  {bulkSelectionCopy.select}
                </button>
              ) : null}
            </>
          )}
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
              isLoading={isLoading}
              isPaymentFinancialsLoading={isPaymentFinancialsLoading}
              isMemberRole={isMemberRole}
              canDelete={canDelete && !isMemberRole}
              deletingProjectId={deletingProjectId}
              busyProjectId={busyProjectId}
              onRequestDelete={setPendingDeleteProject}
              onTogglePriority={togglePriority}
              onRequestCompletionChange={requestCompletionChange}
              showActions={!isMemberRole}
              emptyMessage={subprojectsEmptyMessage}
              onRowClick={handleSubprojectRowClick}
              bulkSelection={bulkSelectionBindings}
            />
          ) : (
            <div className={`${tableStyles.pipeline} ${tableStyles.pipelineFitContent}`}>
              <CrmProjectsTable
                rows={rows}
                paymentTasksIndex={paymentTasksIndex}
                workflowProgressInputIndex={workflowProgressInputIndex}
                isWorkflowProgressLoading={isWorkflowProgressLoading}
                isLoading={isLoading}
                isPaymentFinancialsLoading={isPaymentFinancialsLoading}
                isMemberRole={isMemberRole}
                canDelete={canDelete && !isMemberRole}
                deletingProjectId={deletingProjectId}
                busyProjectId={busyProjectId}
                onRequestDelete={setPendingDeleteProject}
                onTogglePriority={togglePriority}
                onRequestCompletionChange={requestCompletionChange}
                showActions={!isMemberRole}
                projectColumnLabel={copy.projectColumn}
                emptyMessage={subprojectsEmptyMessage}
                onRowClick={handleSubprojectRowClick}
                bulkSelection={bulkSelectionBindings}
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
          <CrmProjectDeleteConfirmModal
            pendingProject={pendingDeleteProject}
            onClose={() => setPendingDeleteProject(null)}
            onConfirm={() => void handleConfirmDelete()}
            confirmTitle={deleteCopy.confirmTitle}
            confirmMessage={deleteCopy.confirmMessage}
          />
          <DestructiveConfirmationWorkflowDialog
            open={bulkDeleteOpen}
            title={destructiveWorkflowCopy.title}
            itemTypeLabel={bulkDeleteItemLabel}
            selectedCount={bulkSelection.selectedCount}
            selectedItemLabels={selectedProjects.map((project) => project.name)}
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
        </>
      ) : null}
    </section>
  );
}
