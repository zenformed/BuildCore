'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectSummary } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  useCrmProjectsPipeline,
} from '@/presentation/features/crmProjects/useCrmProjectsPipeline';
import {
  resolveCrmProjectsTableEmptyMessage,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { consumeCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailPanelHeaderButton } from '@/presentation/components/CrmProjectDetail/DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from '@/presentation/components/CrmProjectDetail/DetailPanelSectionRefresh';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { CrmProjectsFilterMenu } from './CrmProjectsFilterMenu';
import { CrmProjectsTable } from './CrmProjectsTable';
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
  const panelCopy = content.crm.panel;
  const detailCopy = content.projectDetail;
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);
  const {
    rootRows,
    allChildrenByParentId,
    visibleChildrenByParentId,
    paymentTasksIndex,
    totalCount,
    isLoading,
    isPaymentFinancialsLoading,
    refetch,
    removeProject,
    patchProjectSummary,
  } = useCrmProjectsPipeline(searchQuery, filters);
  const [toast, setToast] = useState<PipelineToast | null>(null);

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

  const { catalog: pipelineStageCatalog } = useBuildCorePipelineStages();

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
    stages: pipelineStageCatalog,
  });

  useEffect(() => {
    const message = consumeCrmProjectDeleteSuccessToast();
    if (message) {
      setToast({ kind: 'success', message });
    }
  }, []);

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

  const tableEmptyMessage = resolveCrmProjectsTableEmptyMessage({
    isMemberRole,
    totalProjectCount: totalCount,
    memberNoAssignmentsMessage: content.crm.table.emptyMemberNoAssignments,
    searchOrFiltersMessage: content.crm.table.empty,
  });

  return (
    <section className={styles.projectsPanel} aria-labelledby="crm-projects-heading">
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className={styles.projectsPanelHeader}>
        <h2 id="crm-projects-heading" className={styles.projectsPanelTitle}>
          {panelCopy.title}
        </h2>
        <div className={styles.projectsPanelHeaderTools}>
          <CrmProjectsFilterMenu filters={filters} onChange={setFilters} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={panelCopy.searchPlaceholder}
            aria-label={panelCopy.searchAriaLabel}
            className={styles.projectsSearch}
          />
          <DetailPanelSectionRefresh
            sectionLabel={panelCopy.title}
            onRefresh={refetch}
            onError={(message) => setToast({ kind: 'error', message })}
          />
          {!isMemberRole ? (
            <DetailPanelHeaderButton
              variant="add"
              disabled={createOpen}
              title={nav.header.newProject.title}
              aria-label={nav.header.newProject.ariaLabel}
              onClick={() => setCreateOpen(true)}
            />
          ) : null}
        </div>
      </div>
      <div className={`${styles.pipeline} ${styles.projectsPanelBody}`}>
        <CrmProjectsTable
          enableSubprojectExpansion
          rootRows={rootRows}
          allChildrenByParentId={allChildrenByParentId}
          visibleChildrenByParentId={visibleChildrenByParentId}
          paymentTasksIndex={paymentTasksIndex}
          isLoading={isLoading}
          isPaymentFinancialsLoading={isPaymentFinancialsLoading}
          onRowClick={onProjectRowClick}
          onSubprojectRowClick={handleSubprojectRowClick}
          isMemberRole={isMemberRole}
          canDelete={canDelete && !isMemberRole}
          deletingProjectId={deletingProjectId}
          busyProjectId={busyProjectId}
          onRequestDelete={setPendingDeleteProject}
          onTogglePriority={togglePriority}
          onRequestCompletionChange={requestCompletionChange}
          emptyMessage={tableEmptyMessage}
        />
      </div>
      <CreateCrmProjectModal
        open={createOpen && !isMemberRole}
        onClose={() => setCreateOpen(false)}
        onCreated={handleProjectCreated}
        onTemplateToast={(nextToast) => setToast(nextToast)}
      />
      <CrmProjectDeleteConfirmModal
        pendingProject={pendingDeleteProject}
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
    </section>
  );
}
