'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { MemberProjectOverviewContent } from '@/presentation/components/MemberTasks/MemberProjectOverviewContent';
import { SubprojectsSection } from './SubprojectsSection';
import { ProjectDetailFolderTabs } from './ProjectDetailFolderTabs';
import styles from './ProjectDetail.module.css';

export function ProjectOverviewContent(): ReactElement {
  const { isMemberRole, project } = useProjectDetailShell();
  const isParentProject = project.summary.parentProjectId == null;

  if (isMemberRole && isParentProject) {
    return <MemberProjectOverviewContent />;
  }

  return (
    <div className={styles.detailPanelsScroll}>
      <SubprojectsSection />
      <ProjectDetailFolderTabs />
    </div>
  );
}
