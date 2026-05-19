'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import { DetailToast } from './DetailToast';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectAccountabilityPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

export function ProjectAccountabilityPage({
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectAccountabilityPageProps): ReactElement {
  const workspace = useProjectDetailWorkspace(initialProject, onRefresh);
  const { project, toast, setToast, savingField, patchField } = workspace;
  const acc = content.projectDetail.accountability;
  const entries = sortAccountabilityEntries(project.accountabilityLog);

  return (
    <div className={styles.pageTasks} data-project-accountability-page>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <ProjectDetailContextBlock
        project={project}
        isApiSource={isApiSource}
        pageContext="accountability"
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={<ProjectDetailActionsMenu projectSlug={project.summary.slug} />}
        savingField={savingField}
        patchField={patchField}
      />

      <section
        className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}`}
        aria-labelledby="project-accountability-heading"
      >
        <div className={styles.cardTitleRow}>
          <h3 id="project-accountability-heading" className={styles.cardTitle}>
            {content.projectDetail.sections.accountability}
          </h3>
        </div>
        {entries.length === 0 ? (
          <p className={styles.subtitle}>{acc.empty}</p>
        ) : (
          <AccountabilityLogTable entries={entries} layout="modal" />
        )}
      </section>
    </div>
  );
}
