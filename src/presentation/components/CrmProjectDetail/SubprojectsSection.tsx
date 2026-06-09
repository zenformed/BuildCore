'use client';

import { useId, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { CrmProjectsTable } from '@/presentation/components/CrmProjects/CrmProjectsTable';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import {
  filterSubprojects,
} from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { useCrmProjectTableRowActions } from '@/presentation/features/crmProjects/useCrmProjectTableRowActions';
import { useCrmProjectPaymentTasksIndex } from '@/presentation/features/crmProjects/useCrmProjectPaymentTasksIndex';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import styles from './ProjectDetail.module.css';
import tableStyles from '../CrmProjects/CrmProjects.module.css';

type SubprojectsToast = { kind: 'success' | 'error'; message: string };

export function SubprojectsSection(): ReactElement | null {
  const router = useRouter();
  const sectionId = useId();
  const panelId = useId();
  const copy = content.projectDetail.subprojects;
  const deleteCopy = copy.delete;
  const detailCopy = content.projectDetail;
  const { project, routes, parentRouteSlug, subSlug, isMemberRole, childSummaries } =
    useProjectDetailShell();
  const { organizationMembershipContext } = useSaaSProfile();
  const hidden = subSlug != null || project.summary.parentProjectId != null;
  const canManage = !isMemberRole && !isBuildCoreMemberRole(organizationMembershipContext?.role);
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<SubprojectsToast | null>(null);
  const refetch = childSummaries?.refetch ?? (async () => undefined);
  const patchChildProjectSummary =
    childSummaries?.patchProjectSummary ?? (() => undefined);
  const isLoading = childSummaries?.isLoading ?? false;
  const { paymentTasksIndex, isLoading: isPaymentFinancialsLoading } =
    useCrmProjectPaymentTasksIndex();
  const rows = useMemo(
    () => filterSubprojects(childSummaries?.allRows ?? [], searchQuery),
    [childSummaries?.allRows, searchQuery]
  );

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

  const {
    busyProjectId,
    pendingCompletionChange,
    setPendingCompletionChange,
    togglePriority,
    requestCompletionChange,
    confirmCompletionChange,
  } = useCrmProjectTableRowActions({
    onProjectUpdated: patchChildProjectSummary,
    onSuccess: (message) => setToast({ kind: 'success', message }),
    onError: (message) => setToast({ kind: 'error', message }),
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
      <div className={styles.subprojectsPanelHeader}>
        <button
          type="button"
          className={styles.subprojectsPanelHeaderToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${expanded ? copy.collapse : copy.expand}: ${copy.title}`}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className={styles.subprojectsPanelHeaderTitle}>
            <span id={sectionId} className={styles.subprojectsPanelTitle}>
              {copy.title}
            </span>
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
            </span>
          </span>
        </button>
        <div className={styles.subprojectsPanelHeaderTools}>
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
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className={styles.subprojectsTableBody}>
          <div className={`${tableStyles.pipeline} ${tableStyles.pipelineFitContent}`}>
            <CrmProjectsTable
              rows={rows}
              paymentTasksIndex={paymentTasksIndex}
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
              emptyMessage={copy.empty}
              onRowClick={(child) => router.push(routes.subproject(child.slug))}
            />
          </div>
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
          onCreated={async () => {
            await refetch();
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
