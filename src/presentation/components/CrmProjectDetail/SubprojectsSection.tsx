'use client';

import { useId, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import { CrmProjectsTable } from '@/presentation/components/CrmProjects/CrmProjectsTable';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { useCrmProjectChildSummaries } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import styles from './ProjectDetail.module.css';
import tableStyles from '../CrmProjects/CrmProjects.module.css';

type SubprojectsToast = { kind: 'success' | 'error'; message: string };

export function SubprojectsSection(): ReactElement | null {
  const router = useRouter();
  const sectionId = useId();
  const panelId = useId();
  const copy = content.projectDetail.subprojects;
  const deleteCopy = copy.delete;
  const { project, routes, parentRouteSlug, subSlug, isMemberRole } = useProjectDetailShell();
  const { organizationMembershipContext } = useSaaSProfile();

  if (subSlug != null || project.summary.parentProjectId != null) {
    return null;
  }
  const canManage = !isMemberRole && !isBuildCoreMemberRole(organizationMembershipContext?.role);
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<SubprojectsToast | null>(null);
  const { rows, isLoading, refetch } = useCrmProjectChildSummaries(project.summary, searchQuery);

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

  const sectionClass = [
    styles.subprojectsSection,
    expanded ? '' : styles.subprojectsSection_collapsed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass} aria-labelledby={sectionId}>
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <div className={styles.subprojectsSectionHeader}>
        <button
          type="button"
          className={styles.subprojectsSectionHeaderBtn}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${expanded ? copy.collapse : copy.expand}: ${copy.title}`}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className={styles.stageGroupTitle}>
            <span id={sectionId} className={styles.stageGroupName}>
              {copy.title}
            </span>
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={expanded ? styles.stageGroupChevron_expanded : styles.stageGroupChevron} />
            </span>
          </span>
        </button>
        {expanded ? (
          <div className={styles.subprojectsSectionToolbar}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAriaLabel}
              className={styles.subprojectsSearch}
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
        ) : null}
      </div>

      {expanded ? (
        <div id={panelId} className={styles.subprojectsSectionBody}>
          <div className={tableStyles.pipeline}>
            <CrmProjectsTable
              rows={rows}
              isLoading={isLoading}
              isMemberRole={isMemberRole}
              canDelete={canDelete && !isMemberRole}
              deletingProjectId={deletingProjectId}
              onRequestDelete={setPendingDeleteProject}
              showActions={!isMemberRole}
              projectColumnLabel={copy.projectColumn}
              emptyMessage={copy.empty}
              deleteLabels={deleteCopy}
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
            refetch();
          }}
        />
      ) : null}

      {!isMemberRole ? (
        <CrmProjectDeleteConfirmModal
          pendingProject={pendingDeleteProject}
          onClose={() => setPendingDeleteProject(null)}
          onConfirm={() => void handleConfirmDelete()}
          confirmTitle={deleteCopy.confirmTitle}
          confirmMessage={deleteCopy.confirmMessage}
        />
      ) : null}
    </section>
  );
}
