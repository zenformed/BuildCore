'use client';

import { useEffect, useState, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { useCrmProjectsPipeline } from '@/presentation/features/crmProjects/useCrmProjectsPipeline';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { consumeCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import type { CrmPriorityFilter, CrmStageFilter } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { CrmProjectsFilters } from './CrmProjectsFilters';
import { CrmProjectsTable } from './CrmProjectsTable';
import styles from './CrmProjects.module.css';

export type CrmProjectsPipelineProps = {
  searchQuery: string;
  stageFilter: CrmStageFilter;
  priorityFilter: CrmPriorityFilter;
  createDraftOpen: boolean;
  onCreateDraftOpenChange: (open: boolean) => void;
  onStageFilterChange: (value: CrmStageFilter) => void;
  onPriorityFilterChange: (value: CrmPriorityFilter) => void;
  onProjectRowClick: (project: CrmProjectSummary) => void;
  onProjectCreated?: () => void | Promise<void>;
};

type PipelineToast = { kind: 'success' | 'error'; message: string };

export function CrmProjectsPipeline({
  searchQuery,
  stageFilter,
  priorityFilter,
  createDraftOpen,
  onCreateDraftOpenChange,
  onStageFilterChange,
  onPriorityFilterChange,
  onProjectRowClick,
  onProjectCreated,
}: CrmProjectsPipelineProps): ReactElement {
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);
  const { rows, totalCount, filteredCount, isLoading, refetch, removeProject } = useCrmProjectsPipeline(
    searchQuery,
    stageFilter,
    priorityFilter
  );
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

  useEffect(() => {
    const message = consumeCrmProjectDeleteSuccessToast();
    if (message) {
      setToast({ kind: 'success', message });
    }
  }, []);

  const handleProjectCreated = async (): Promise<void> => {
    refetch();
    onCreateDraftOpenChange(false);
    await onProjectCreated?.();
  };

  return (
    <div className={styles.pipeline}>
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <CrmProjectsFilters
        stageFilter={stageFilter}
        priorityFilter={priorityFilter}
        filteredCount={filteredCount}
        totalCount={totalCount}
        onStageFilterChange={onStageFilterChange}
        onPriorityFilterChange={onPriorityFilterChange}
      />
      <CrmProjectsTable
        rows={rows}
        isLoading={isLoading}
        draftOpen={createDraftOpen && !isMemberRole}
        onDraftOpenChange={onCreateDraftOpenChange}
        onProjectCreated={handleProjectCreated}
        onRowClick={onProjectRowClick}
        isMemberRole={isMemberRole}
        canDelete={canDelete && !isMemberRole}
        deletingProjectId={deletingProjectId}
        onRequestDelete={setPendingDeleteProject}
        onTemplateToast={(toast) => setToast(toast)}
      />
      <CrmProjectDeleteConfirmModal
        pendingProject={pendingDeleteProject}
        onClose={() => setPendingDeleteProject(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
