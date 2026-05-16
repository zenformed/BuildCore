'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { AccountabilityPanel } from './AccountabilityPanel';
import { MilestoneSummaryPanel } from './MilestoneSummaryPanel';
import { ProjectContactCard } from './ProjectContactCard';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDocumentsPanel } from './ProjectDocumentsPanel';
import { StageProgressBar } from './StageProgressBar';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export type ProjectDetailPageProps = {
  project: CrmProjectDetail;
  onBack: () => void;
};

export function ProjectDetailPage({ project, onBack }: ProjectDetailPageProps): ReactElement {
  const nextStep = project.summary.waitingOn?.trim() || content.projectDetail.noNextStep;

  return (
    <div className={styles.page}>
      <ProjectDetailHeader project={project.summary} onBack={onBack} />
      <div className={styles.nextStep}>
        <span className={styles.nextStepLabel}>{content.projectDetail.nextStepLabel}</span>
        {nextStep}
      </div>
      <div className={styles.grid2}>
        <ProjectContactCard project={project} />
        <MilestoneSummaryPanel project={project} />
      </div>
      <StageProgressBar stageProgress={project.stageProgress} />
      <div className={styles.grid2}>
        <WorkflowTasksTable project={project} />
        <div className={styles.stackColumn}>
          <ProjectDocumentsPanel project={project} />
          <AccountabilityPanel project={project} />
        </div>
      </div>
    </div>
  );
}
