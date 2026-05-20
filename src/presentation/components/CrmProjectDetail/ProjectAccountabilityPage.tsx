'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import { ProjectDetailShell } from './ProjectDetailShell';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectAccountabilityPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

function ProjectAccountabilityContent(): ReactElement {
  const { project } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const entries = sortAccountabilityEntries(project.accountabilityLog);

  return (
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
  );
}

export function ProjectAccountabilityPage({
  project,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectAccountabilityPageProps): ReactElement {
  return (
    <ProjectDetailShell
      pageContext="accountability"
      project={project}
      isApiSource={isApiSource}
      onBack={onBack}
      onOpenProject={onOpenProject}
      onRefresh={onRefresh}
      includeWorkflowModals={false}
    >
      <ProjectAccountabilityContent />
    </ProjectDetailShell>
  );
}
